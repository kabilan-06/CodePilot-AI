// AI Developer Swarm — shared types for the agent pipeline.

export const AGENT_ROLES = ["architect", "developer", "security", "tester", "reviewer"] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export interface FilePatch {
  path: string;
  before: string;
  after: string;
  /** True when `before` was verified against the actual repository content. */
  verified: boolean;
}

export interface SwarmPlan {
  objectives: string[];
  steps: string[];
  filesToModify: string[];
  risks: string[];
}

export interface SecurityFindings {
  approvable: boolean;
  iterations: number;
  findings: Array<{ severity: string; title: string; detail: string; file: string }>;
  instructions: string[];
}

export interface TestPlan {
  strategy: string;
  cases: Array<{ name: string; description: string; expected: string }>;
  commands: string[];
  expectedResults: string;
}

export interface SwarmVerdict {
  verdict: "approve" | "approve-with-comments" | "reject";
  confidence: number;
  summary: string;
  followUps: string[];
}

export interface TranscriptEntry {
  role: AgentRole | "user" | "system";
  ts: string;
  message: string;
  /** Artifact ids referencing the artifacts record. */
  artifacts?: string[];
}

export interface SwarmArtifacts {
  contextFiles: Array<{ path: string; chars: number; included: boolean }>;
  plan?: SwarmPlan;
  patches?: FilePatch[];
  security?: SecurityFindings;
  tests?: TestPlan;
  branchName?: string;
}

export interface SwarmRun {
  id: string;
  owner: string;
  repo: string;
  ref: string;
  task: string;
  status: string;
  transcript: TranscriptEntry[];
  artifacts: SwarmArtifacts;
  verdict: SwarmVerdict | null;
  model: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}
