// Self-Healing Development Environment — shared types.

export interface Diagnosis {
  classification: string;
  category: string;
  rootCause: string;
  contributingFactors: string[];
  confidence: number;
  fileHypotheses: string[];
}

export interface HealPatch {
  path: string;
  before: string;
  after: string;
  verified: boolean;
}

export interface SandboxReport {
  capability: { available: boolean; git: string | null; reason?: string; runtime: string };
  applied: Array<{ path: string; existedBefore: boolean; ok: boolean }>;
  commands: string[];
  exec: Array<{
    command: string;
    exitCode: number | null;
    timedOut: boolean;
    passed: boolean;
    stdout: string;
    stderr: string;
  }>;
  verdict: "verified" | "rolled-back" | "blocked";
  rolledBack: boolean;
  rollbackResult: Array<{ path: string; restored: boolean; created: boolean; error?: string }>;
  note?: string;
}

export interface HealRun {
  id: string;
  owner: string | null;
  repo: string | null;
  ref: string | null;
  errorText: string;
  status: string;
  diagnosis: Diagnosis | null;
  patch: HealPatch[];
  sandbox: SandboxReport | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}
