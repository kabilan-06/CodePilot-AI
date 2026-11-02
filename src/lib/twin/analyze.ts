// Per-file static analysis used by the Digital Twin indexer. Pure functions on
// (path, content) — no network, no filesystem, easy to unit-test in isolation.

export interface DetectedEndpoint {
  method: string;
  path: string;
  framework: string;
}

export interface DetectedTable {
  name: string;
  via: "def" | "ref";
}

export interface FileFacts {
  lang: string;
  loc: number;
  complexity: number;
  imports: string[];
  endpoints: DetectedEndpoint[];
  tables: DetectedTable[];
  frameworks: string[];
}

const CODE_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "vue",
  "svelte",
  "py",
  "java",
  "kt",
  "go",
  "rb",
  "php",
  "cs",
  "rs",
  "sql",
  "prisma",
  "css",
  "scss",
  "html",
  "json",
  "yml",
  "yaml",
  "toml",
]);

const BINARYISH_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "ico",
  "bmp",
  "tiff",
  "avif",
  "mp4",
  "mp3",
  "wav",
  "ogg",
  "mov",
  "webm",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "zip",
  "gz",
  "tgz",
  "tar",
  "bz2",
  "7z",
  "rar",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "exe",
  "dll",
  "so",
  "dylib",
  "jar",
  "class",
  "wasm",
  "lock",
  "min.js",
  "min.css",
  "map",
  "pyc",
  "ds_store",
  "bin",
  "dat",
  "db",
  "sqlite",
  "sqlite3",
  "node",
  "envlock",
  "csv",
  "tsv",
  "parquet",
]);

export function extOf(path: string): string {
  const base = path.split("/").pop() ?? path;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function isCodeFile(path: string): boolean {
  return CODE_EXTENSIONS.has(extOf(path));
}

export function isBinaryFile(path: string): boolean {
  return BINARYISH_EXTENSIONS.has(extOf(path));
}

export function detectLanguage(path: string): string {
  const ext = extOf(path);
  if (ext === "tsx" || path.endsWith(".react")) return "typescript-react";
  if (["ts", "mts", "cts"].includes(ext)) return "typescript";
  if (["js", "mjs", "cjs"].includes(ext)) return "javascript";
  if (["jsx"].includes(ext)) return "javascript-react";
  switch (ext) {
    case "py":
      return "python";
    case "java":
      return "java";
    case "kt":
      return "kotlin";
    case "go":
      return "go";
    case "rb":
      return "ruby";
    case "php":
      return "php";
    case "cs":
      return "csharp";
    case "rs":
      return "rust";
    case "sql":
      return "sql";
    case "prisma":
      return "prisma";
    case "css":
    case "scss":
      return "css";
    case "html":
      return "html";
    case "vue":
      return "vue";
    case "svelte":
      return "svelte";
    case "json":
      return "json";
    case "yml":
    case "yaml":
      return "yaml";
    case "toml":
      return "toml";
    default:
      return ext || "other";
  }
}

function countMatches(content: string, regex: RegExp): number {
  const matches = content.match(new RegExp(regex.source, regex.flags));
  return matches ? matches.length : 0;
}

const IMPORT_RES =
  /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)[`'"]([^`'"\n]{1,200})[`'"]/g;
const PY_IMPORT_RES = [
  /*(*/ /\bimport\s+([a-zA-Z_][\w.]*)/g,
  /\bfrom\s+([a-zA-Z_][\w.]*)\s+import\b/g,
];
const GO_IMPORT_RES = /import\s+(?:\(([\s\S]*?)\)|[`"']([^`"'\n]+)[`"'])/g;
const JAVA_IMPORT_RES = /^\s*import\s+([\w.]+)\s*;/gm;
const CSS_IMPORT_RES = /@import\s+(?:url\()?["'`]([^"'`)\n]+)/g;

const NODE_ENDPOINT_RES =
  /\b(?:app|router|server|api|route|fastify|hono)\s*\.\s*(get|post|put|patch|delete|all)\s*\(\s*[`'"]([^`'"]{1,160})[`'"]/g;
const PY_ENDPOINT_RES =
  /@(?:app|router|api|blueprint)\.(get|post|put|patch|delete)\s*\(\s*["'"]([^"'"]{1,160})["'"]/g;
const FLASK_ENDPOINT_RES =
  /@(?:app|blueprint)\.route\s*\(\s*["']([^"']{1,160})["'][^)]*(?:methods\s*=\s*\[([^\]]*)\])?/g;
const SPRING_ENDPOINT_RES =
  /@(Get|Post|Put|Patch|Delete|Request)Mapping\s*\(\s*(?:value\s*=\s*)?["']?([^"')]{0,160})["']?/g;
const GO_ENDPOINT_RES = /(?:HandleFunc|Handle)\s*\(\s*[`'"]([^`'"]{1,160})[`'"]/g;

const SQL_DEF_RES = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?[`"']?(\w+)[`"']?/gi;
const SQL_REF_RES = /references\s+(?:public\.)?[`"']?(\w+)[`"']?/gi;
const PRISMA_DEF_RES = /^\s*model\s+(\w+)\s*\{/gm;
const SUPABASE_REF_RES = /\.from\s*\(\s*["']([^"'\n]{1,80})["']\s*\)/g;
const DRIZZLE_DEF_RES = /(?:pg|mySql|sqlite|mysql)Table\s*\(\s*["']([^"'\n]{1,80})["']/g;
const SEQUELIZE_DEF_RES = /(?:define|\.getViewModel)\s*\(\s*["']([^"'\n]{1,80})["']/g;

const FRAMEWORK_HINTS: Array<[RegExp, string]> = [
  [/from\s+["'](?:next|next\/[^"']*)["']/, "next"],
  [/from\s+["']@tanstack\/react-start["']/, "tanstack-start"],
  [/from\s+["']@nestjs\/[^"']+["']/, "nestjs"],
  [/from\s+["']express["']/, "express"],
  [/from\s+["']fastapi["']/, "fastapi"],
  [/from\s+["'](?:flask|flask_restful)["']/, "flask"],
  [/org\.springframework/, "spring"],
  [/import\s+\(?\s*["']hono["']/, "hono"],
  [/github\.com\/ gin-gonic|gin-gonic/, "gin"],
  [/from\s+["']@supabase[^"']+["']/, "supabase"],
  [/from\s+["']drizzle[^"']+["']/, "drizzle"],
  [/PrismaClient/, "prisma"],
];

function extractJavaScriptImports(content: string): string[] {
  const imports: string[] = [];
  for (const match of content.matchAll(IMPORT_RES)) {
    const spec = match[1];
    if (spec && !spec.endsWith(".css.js")) imports.push(spec);
  }
  return imports;
}

function extractPythonImports(content: string): string[] {
  const imports: string[] = [];
  for (const re of PY_IMPORT_RES) {
    for (const match of content.matchAll(re)) {
      if (match[1]) imports.push(match[1]);
    }
  }
  return imports;
}

function extractGoImports(content: string): string[] {
  const imports: string[] = [];
  for (const match of content.matchAll(GO_IMPORT_RES)) {
    const block = match[1];
    if (block) {
      for (const line of block.split("\n")) {
        const spec = line.match(/["'`]([^"'`]+)["'`]/);
        if (spec?.[1]) imports.push(spec[1]);
      }
    } else if (match[2]) imports.push(match[2]);
  }
  return imports;
}

export function analyzeFile(path: string, content: string): FileFacts {
  const lang = detectLanguage(path);
  const loc = content.length ? content.split("\n").length : 0;
  const frameworks: string[] = [];
  for (const [re, name] of FRAMEWORK_HINTS) {
    if (re.test(content) && !frameworks.includes(name)) frameworks.push(name);
  }

  const complexity =
    1 +
    countMatches(content, /\b(if|else|for|while|case|catch|elif)\b/g) +
    countMatches(content, /&&|\|\||\?\?|\?.\w/g);

  const endpoints: DetectedEndpoint[] = [];
  const pushEndpoint = (method: string, path_: string, framework: string) => {
    const trimmed = path_?.trim();
    if (!trimmed || trimmed.length < 1 || trimmed.length > 160) return;
    if (!/^[A-Za-z0-9/_\-:.{}*[\]+]+$/.test(trimmed)) return;
    if (
      endpoints.length >= 60 ||
      endpoints.some((e) => e.path === trimmed && e.method === method)
    ) {
      return;
    }
    endpoints.push({ method: method.toUpperCase(), path: trimmed, framework });
  };

  for (const m of content.matchAll(NODE_ENDPOINT_RES)) pushEndpoint(m[1], m[2], "node-http");
  for (const m of content.matchAll(PY_ENDPOINT_RES)) pushEndpoint(m[1], m[2], "fastapi");
  for (const m of content.matchAll(FLASK_ENDPOINT_RES))
    pushEndpoint((m[2] ?? "get").toUpperCase(), m[1], "flask");
  for (const m of content.matchAll(SPRING_ENDPOINT_RES)) {
    const verb = m[1] === "Request" ? "all" : m[1];
    pushEndpoint(verb, m[2] || "/", "spring");
  }
  for (const m of content.matchAll(GO_ENDPOINT_RES)) pushEndpoint("get", m[1], "go-http");

  const tables: DetectedTable[] = [];
  const pushTable = (name: string | undefined, via: "def" | "ref") => {
    if (!name) return;
    if (tables.length >= 60) return;
    if (!tables.some((t) => t.name === name)) tables.push({ name, via });
  };
  if (lang === "sql") {
    for (const m of content.matchAll(SQL_DEF_RES)) pushTable(m[1], "def");
    for (const m of content.matchAll(SQL_REF_RES)) pushTable(m[1], "ref");
  }
  if (lang === "prisma") {
    for (const m of content.matchAll(PRISMA_DEF_RES)) pushTable(m[1], "def");
  }
  if (["typescript", "javascript", "typescript-react", "javascript-react"].includes(lang)) {
    for (const m of content.matchAll(SUPABASE_REF_RES)) pushTable(m[1], "ref");
    for (const m of content.matchAll(DRIZZLE_DEF_RES)) pushTable(m[1], "def");
    for (const m of content.matchAll(SEQUELIZE_DEF_RES)) pushTable(m[1], "def");
  }

  let imports: string[] = [];
  switch (lang) {
    case "typescript":
    case "typescript-react":
    case "javascript":
    case "javascript-react":
    case "vue":
    case "svelte":
      imports = extractJavaScriptImports(content);
      break;
    case "python":
      imports = extractPythonImports(content);
      break;
    case "go":
      imports = extractGoImports(content);
      break;
    case "java":
    case "kotlin":
    case "csharp":
      imports = Array.from(content.matchAll(JAVA_IMPORT_RES))
        .map((m) => m[1])
        .filter(Boolean) as string[];
      break;
    case "css":
    case "scss":
    case "html":
      imports = Array.from(content.matchAll(CSS_IMPORT_RES))
        .map((m) => m[1])
        .filter(Boolean) as string[];
      break;
    default:
      imports = [];
  }
  imports = Array.from(new Set(imports)).slice(0, 80);

  return { lang, loc, complexity, imports, endpoints, tables, frameworks };
}

export function emptyFacts(path: string): FileFacts {
  return {
    lang: detectLanguage(path),
    loc: 0,
    complexity: 0,
    imports: [],
    endpoints: [],
    tables: [],
    frameworks: [],
  };
}
