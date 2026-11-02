// Codebase Digital Twin — shared graph types used by the indexer (server) and
// the interactive visualization (client).

export type TwinNodeKind = "file" | "endpoint" | "db" | "package";

export interface TwinNode {
  id: string;
  kind: TwinNodeKind;
  label: string;
  /** Full repo path for file nodes. */
  path?: string;
  /** Detected language for file nodes. */
  lang?: string;
  /** Top-level directory for files, or "api" / "db" / "external". */
  group: string;
  loc: number;
  complexity?: number;
  fanIn: number;
  fanOut: number;
  /** Extra detail shown in the inspector (e.g. endpoint method/path). */
  detail?: string;
  /** Layout coordinates (columns: db → api → files → packages). */
  x: number;
  y: number;
}

export interface TwinEdge {
  from: string;
  to: string;
  kind: "import" | "serves" | "defines" | "uses" | "external";
}

export interface TwinGraph {
  nodes: TwinNode[];
  edges: TwinEdge[];
}

export interface TwinStats {
  scanned: number;
  analyzed: number;
  truncated: boolean;
  languages: Record<string, number>;
  endpointCount: number;
  tableCount: number;
  packageCount: number;
  groups: string[];
  warnings: string[];
}

export interface TwinSnapshot {
  id: string;
  owner: string;
  repo: string;
  ref: string;
  treeSha: string;
  fileCount: number;
  stats: TwinStats;
  graph: TwinGraph;
  createdAt: string;
}

export interface TwinRepoInput {
  owner: string;
  repo: string;
  ref: string;
}

export function twinNodeId(kindHint: "file" | "endpoint" | "db" | "package", value: string) {
  switch (kindHint) {
    case "file":
      return `f:${value}`;
    case "endpoint":
      return `a:${value}`;
    case "db":
      return `t:${value}`;
    default:
      return `p:${value}`;
  }
}
