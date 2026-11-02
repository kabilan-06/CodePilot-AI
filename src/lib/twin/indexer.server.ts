// Digital Twin indexer. Builds a real architecture graph from a repository's
// GitHub tree + sampled file contents: files with imports/LOC, REST endpoints,
// database tables, package dependencies, fan-in/out metrics and a deterministic
// layered layout (db → api → files → packages).

import { githubFetch, githubRaw } from "../github.server";
import { analyzeFile, detectLanguage, extOf, isCodeFile, isBinaryFile } from "./analyze";
import type { TwinEdge, TwinGraph, TwinNode, TwinStats } from "./twin-types";
import { twinNodeId } from "./twin-types";

export interface GitHubTreeEntry {
  path: string;
  type: string;
  size?: number;
}

export interface RepoScan {
  sha: string;
  truncated: boolean;
  /** Code-relevant blobs after filtering junk directories and binaries. */
  files: GitHubTreeEntry[];
  skipped: number;
}

const MAX_SCAN_FILES = 800;
const CONTENT_BUDGET = 60;
const CONTENT_CAP_CHARS = 80_000;
const MAX_EDGE_CHARS = 2_400;
const MAX_ENDPOINT_NODES = 300;

const SKIP_DIR_PARTS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  ".git",
  ".github",
  ".next",
  ".nuxt",
  ".turbo",
  ".vercel",
  ".cloudflare",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
  "vendor",
  "target",
  ".docusaurus",
  ".cache",
  ".idea",
  ".vscode",
  ".wrangler",
  ".output",
  ".tanstack",
  ".lovable",
  "bun.lockb",
  "vendor/cache",
]);

export function pathIsScannable(path: string): boolean {
  const parts = path.toLowerCase().split("/");
  if (parts.some((p) => SKIP_DIR_PARTS.has(p))) return false;
  if (path.split("/").pop()?.startsWith(".env")) return false;
  if (path.endsWith(".lock") || path.includes(".min.") || path.endsWith(".map")) return false;
  if (isBinaryFile(path)) return false;
  if (!isCodeFile(path)) {
    // Keep a few extension-less-but-interesting files
    return /^(dockerfile|makefile|requirements\.txt|go\.mod|pyproject\.toml)$/i.test(
      path.split("/").pop() ?? "",
    );
  }
  return true;
}

export async function scanRepoTree(
  token: string,
  owner: string,
  repo: string,
  ref: string,
): Promise<RepoScan> {
  const tree = await githubFetch<{
    sha: string;
    truncated?: boolean;
    tree: GitHubTreeEntry[];
  }>(token, `repos/${owner}/${repo}/git/trees/${ref}?recursive=1`);

  const blobs = (tree.tree ?? []).filter((entry) => entry.type === "blob");
  const okay = blobs.filter((entry) => pathIsScannable(entry.path));
  const skipped = blobs.length - okay.length;

  let files = okay;
  if (files.length > MAX_SCAN_FILES) {
    files = files
      .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
      .slice(0, MAX_SCAN_FILES)
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  return {
    sha: tree.sha,
    truncated: Boolean(tree.truncated) || blobs.length > okay.length || files.length < okay.length,
    files,
    skipped,
  };
}

/* ---------- import resolution ---------- */

const TS_CANDIDATE_EXTS = ["ts", "tsx", "js", "jsx", "mjs", "cjs", "vue", "svelte", "json", "css"];

const ALIAS_PREFIXES: Array<[string, string]> = [
  ["@/", "src/"],
  ["~/", "src/"],
  ["@app/", "src/app/"],
  ["@components/", "src/components/"],
  ["@lib/", "src/lib/"],
];

class PathIndex {
  paths: Set<string>;
  byBase: Map<string, string[]> = new Map();

  constructor(paths: string[]) {
    this.paths = new Set(paths);
    for (const p of paths) {
      const base = p.split("/").pop() ?? p;
      const list = this.byBase.get(base) ?? [];
      list.push(p);
      this.byBase.set(base, list);
    }
  }

  has(path: string) {
    return this.paths.has(path);
  }
}

function candidatesFor(base: string): string[] {
  const out = [base];
  for (const ext of TS_CANDIDATE_EXTS) out.push(`${base}.${ext}`);
  for (const ext of TS_CANDIDATE_EXTS) out.push(`${base}/index.${ext}`);
  return out;
}

function resolveProjectPath(rawPath: string, index: PathIndex): string | null {
  for (const candidate of candidatesFor(rawPath)) {
    if (index.has(candidate)) return candidate;
  }
  return null;
}

/** Resolves one import specifier to a twin node id, or null when external/dangling. */
function resolveImport(
  spec: string,
  fromDir: string,
  language: string,
  index: PathIndex,
):
  | { kind: "file"; id: string; path: string }
  | { kind: "package"; id: string; name: string }
  | null {
  if (!spec) return null;

  if (
    language.startsWith("typescript") ||
    ["javascript", "javascript-react", "vue", "svelte"].includes(language)
  ) {
    const clean = spec.split("?")[0].split("#")[0];
    if (!clean) return null;

    if (clean.startsWith(".")) {
      const dir = fromDir || "";
      const parts = (dir ? `${dir}/${clean}` : clean).split("/");
      const stack: string[] = [];
      for (const part of parts) {
        if (part === "." || part === "") continue;
        if (part === "..") stack.pop();
        else stack.push(part);
      }
      const resolved = resolveProjectPath(stack.join("/"), index);
      return resolved ? { kind: "file", id: twinNodeId("file", resolved), path: resolved } : null;
    }

    let mapped = clean;
    for (const [alias, target] of ALIAS_PREFIXES) {
      if (clean.startsWith(alias)) {
        mapped = target + clean.slice(alias.length);
        break;
      }
    }
    if (mapped !== clean) {
      const resolved = resolveProjectPath(mapped, index);
      if (resolved) return { kind: "file", id: twinNodeId("file", resolved), path: resolved };
      return null;
    }
    if (clean.startsWith("src/") || clean.startsWith("app/")) {
      const resolved = resolveProjectPath(clean, index);
      if (resolved) return { kind: "file", id: twinNodeId("file", resolved), path: resolved };
      return null;
    }

    const segments = clean.split("/");
    const name = clean.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
    return name ? { kind: "package", id: twinNodeId("package", name), name } : null;
  }

  if (language === "python") {
    const parts = spec.split(".");
    while (parts.length > 0) {
      const joined = parts.join("/");
      for (const prefix of ["", "src/"]) {
        const resolved =
          resolveProjectPath(`${prefix}${joined}`, index) ??
          resolveProjectPath(`${prefix}${joined}/__init__`, index);
        if (resolved) return { kind: "file", id: twinNodeId("file", resolved), path: resolved };
      }
      parts.pop();
    }
    return null;
  }

  if (language === "java" || language === "kotlin" || language === "csharp") {
    const base = spec.split(".").pop() ?? spec;
    const matches = index.byBase.get(base) ?? [];
    const best = matches.find((p) => p.replace(/[/.]/g, ".").endsWith(spec)) ?? matches[0];
    if (best) return { kind: "file", id: twinNodeId("file", best), path: best };
    return null;
  }

  if (language === "go") {
    const parts = spec.split("/");
    for (let cut = parts.length; cut > 0; cut--) {
      const joined = parts.slice(0, cut).join("/");
      const hits = Array.from(index.paths).filter((p) => p.startsWith(`${joined}/`));
      if (hits.length > 0) {
        return { kind: "file", id: twinNodeId("file", hits[0]), path: hits[0] };
      }
    }
    return null;
  }

  return null;
}

/* ---------- content selection ---------- */

function contentPriority(path: string): number {
  const lower = path.toLowerCase();
  const fileName = lower.split("/").pop() ?? "";
  if (lower.startsWith("supabase/migrations") || lower.endsWith(".prisma")) return 0;
  if (
    /main\.|app\.|index\.|server\.|__root|root\.tsx|_app/.test(fileName) &&
    path.split("/").length <= 4
  )
    return 1;
  if (
    /(^|\/)(src|app|lib|routes|pages|api|server|backend|services|controllers|models|handlers?)\//.test(
      lower,
    )
  ) {
    if (/(api|route|router|endpoint|controller|schema|model|migration|resolvers?)/.test(lower))
      return 2;
    return 3;
  }
  if (path.split("/").length <= 3) return 4;
  return 5;
}

/* ---------- graph assembly ---------- */

export interface TwinBuildOutput {
  stats: TwinStats;
  graph: TwinGraph;
  fileCount: number;
}

export async function buildTwinFromScan(
  token: string,
  owner: string,
  repo: string,
  scan: RepoScan,
): Promise<TwinBuildOutput> {
  const warnings: string[] = [];
  const filePaths = scan.files.map((f) => f.path);
  const dirOf = (p: string) => {
    const idx = p.lastIndexOf("/");
    return idx === -1 ? "" : p.slice(0, idx);
  };

  // 1) Select files for real content analysis.
  const orderByPriority = [...scan.files].sort((a, b) => {
    const pa = contentPriority(a.path) - contentPriority(b.path);
    return pa !== 0 ? pa : a.path.localeCompare(b.path);
  });
  const contentSample = new Map(orderByPriority.slice(0, CONTENT_BUDGET).map((f) => [f.path, f]));

  // 2) Fetch contents in small parallel batches.
  interface FetchedFacts {
    content: string | null;
    facts: ReturnType<typeof analyzeFile>;
  }
  const analyzed = new Map<string, FetchedFacts>();
  const sampleList = Array.from(contentSample.values());

  for (let start = 0; start < sampleList.length; start += 8) {
    const batch = sampleList.slice(start, start + 8);
    const results = await Promise.all(
      batch.map(async (entry) => {
        try {
          const raw = await githubRaw(
            token,
            `repos/${owner}/${repo}/contents/${entry.path}`,
            "application/vnd.github.raw",
          );
          const content = raw.slice(0, CONTENT_CAP_CHARS);
          return { path: entry.path, content, facts: analyzeFile(entry.path, content) };
        } catch {
          return { path: entry.path, content: null, facts: null };
        }
      }),
    );
    for (const result of results) {
      if (result.content !== null && result.facts) {
        analyzed.set(result.path, { content: result.content, facts: result.facts });
      }
    }
  }

  const failedFetches = sampleList.length - analyzed.size;
  if (failedFetches > 0) warnings.push(`${failedFetches} content files could not be read.`);

  // 3) Nodes for every scanned file.
  const nodes = new Map<string, TwinNode>();
  const edges: TwinEdge[] = [];
  const languages: Record<string, number> = {};
  const groupsSet = new Set<string>();

  for (const entry of scan.files) {
    const lang = detectLanguage(entry.path);
    languages[lang] = (languages[lang] ?? 0) + 1;
    const group = entry.path.includes("/") ? entry.path.split("/")[0] : "root";
    groupsSet.add(group);
    const facts = analyzed.get(entry.path)?.facts ?? null;
    const id = twinNodeId("file", entry.path);
    nodes.set(id, {
      id,
      kind: "file",
      label: entry.path.split("/").pop() ?? entry.path,
      path: entry.path,
      lang,
      group,
      loc: facts?.loc || Math.max(1, Math.round((entry.size ?? 0) / 40)),
      complexity: facts?.complexity || undefined,
      fanIn: 0,
      fanOut: 0,
      detail: facts?.frameworks.length ? `frameworks: ${facts.frameworks.join(", ")}` : undefined,
      x: 0,
      y: 0,
    });
  }

  const pathIndex = new PathIndex(filePaths);

  // 4) Import edges + package usage counting.
  const packageCount = new Map<string, number>();
  for (const [path, { facts }] of analyzed) {
    const fromId = twinNodeId("file", path);
    for (const spec of facts.imports) {
      const resolved = resolveImport(spec, dirOf(path), facts.lang, pathIndex);
      if (!resolved) continue;
      if (resolved.kind === "package") {
        packageCount.set(resolved.name, (packageCount.get(resolved.name) ?? 0) + 1);
        continue;
      }
      if (resolved.id === fromId) continue;
      edges.push({ from: fromId, to: resolved.id, kind: "import" });
    }
  }

  // 5) Package nodes (top N real dependencies).
  const topPackages = Array.from(packageCount.entries())
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 14);
  for (const [name] of topPackages) {
    const id = twinNodeId("package", name);
    nodes.set(id, {
      id,
      kind: "package",
      label: name,
      group: "external",
      loc: 0,
      fanIn: packageCount.get(name) ?? 0,
      fanOut: 0,
      detail: `imported by ${packageCount.get(name) ?? 0} files`,
      x: 0,
      y: 0,
    });
  }
  for (const [path, { facts }] of analyzed) {
    for (const spec of facts.imports) {
      const resolved = resolveImport(spec, dirOf(path), facts.lang, pathIndex);
      if (resolved && resolved.kind === "package" && nodes.has(resolved.id)) {
        edges.push({ from: twinNodeId("file", path), to: resolved.id, kind: "import" });
      }
    }
  }

  // 6) Endpoint nodes/graph connections.
  let endpointCount = 0;
  const endpointSeen = new Map<string, string>();
  for (const [path, { facts }] of analyzed) {
    for (const endpoint of facts.endpoints) {
      if (endpointCount >= MAX_ENDPOINT_NODES) break;
      const label = `${endpoint.method} ${endpoint.path}`;
      let id = endpointSeen.get(label);
      if (!id) {
        id = twinNodeId("endpoint", label);
        endpointSeen.set(label, id);
        nodes.set(id, {
          id,
          kind: "endpoint",
          label,
          group: "api",
          loc: 0,
          fanIn: 0,
          fanOut: 0,
          detail: endpoint.framework,
          x: 0,
          y: 0,
        });
        endpointCount += 1;
      }
      edges.push({ from: id, to: twinNodeId("file", path), kind: "serves" });
    }
  }

  // 7) Database tables: definitions + client usage.
  const tableRefCounts = new Map<string, number>();
  for (const [, { facts }] of analyzed) {
    for (const table of facts.tables) {
      if (table.via === "ref") {
        tableRefCounts.set(table.name, (tableRefCounts.get(table.name) ?? 0) + 1);
      }
    }
  }
  let tableCount = 0;
  for (const [path, { facts }] of analyzed) {
    for (const table of facts.tables) {
      if (table.via !== "def" || tableCount >= 80) continue;
      const id = twinNodeId("db", table.name);
      if (!nodes.has(id)) {
        nodes.set(id, {
          id,
          kind: "db",
          label: table.name,
          group: "db",
          loc: 0,
          fanIn: 0,
          fanOut: 0,
          detail: "table",
          x: 0,
          y: 0,
        });
        tableCount += 1;
      }
      edges.push({ from: twinNodeId("file", path), to: id, kind: "defines" });
    }
  }
  if (tableCount === 0) {
    warnings.push("No SQL definitions found — table nodes come from SQL, Prisma or ORM files.");
  }
  for (const [name, count] of tableRefCounts) {
    const id = twinNodeId("db", name);
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        kind: "db",
        label: name,
        group: "db",
        loc: 0,
        fanIn: 0,
        fanOut: 0,
        detail: `${count} client references (definition not scanned)`,
        x: 0,
        y: 0,
      });
      tableCount += 1;
    }
  }

  // 8) Deduplicate edges, cap, and compute fan metrics.
  const edgeSeen = new Set<string>();
  const uniqueEdges: TwinEdge[] = [];
  for (const edge of edges) {
    const key = `${edge.from}|${edge.to}|${edge.kind}`;
    if (edgeSeen.has(key) || edge.from === edge.to) continue;
    edgeSeen.add(key);
    uniqueEdges.push(edge);
    if (uniqueEdges.length >= MAX_EDGE_CHARS) {
      warnings.push("Dependency edges truncated at the cap for readability.");
      break;
    }
  }

  for (const edge of uniqueEdges) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (from) from.fanOut += 1;
    if (to) to.fanIn += 1;
  }

  // 9) Deterministic layered layout: db → api → files → packages.
  const columnOf: Record<TwinNode["kind"], number> = { db: 0, endpoint: 1, file: 2, package: 3 };
  const byColumn: TwinNode[][] = [[], [], [], []];
  for (const node of nodes.values()) byColumn[columnOf[node.kind]].push(node);
  byColumn.forEach((column, colIdx) => {
    column.sort(
      (a, b) => b.fanIn + b.fanOut - (a.fanIn + a.fanOut) || a.label.localeCompare(b.label),
    );
    column.forEach((node, row) => {
      node.x = 60 + colIdx * 280;
      node.y = 40 + row * 62;
    });
  });

  const stats: TwinStats = {
    scanned: scan.files.length,
    analyzed: analyzed.size,
    truncated: scan.truncated,
    languages,
    endpointCount,
    tableCount,
    packageCount: topPackages.length,
    groups: Array.from(groupsSet).sort().slice(0, 16),
    warnings: scan.truncated
      ? [...warnings, "Repository tree was truncated to keep the map readable."]
      : warnings,
  };

  return {
    stats,
    graph: { nodes: Array.from(nodes.values()), edges: uniqueEdges },
    fileCount: scan.files.length,
  };
}
