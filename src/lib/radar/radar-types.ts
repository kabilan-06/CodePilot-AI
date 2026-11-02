// Predictive Bug Radar — shared types.

export type RadarMode = "full-repo" | "pr" | "commit" | "diff";

export interface RiskyFile {
  path: string;
  score: number;
  maxScore: number;
  reasons: string[];
  churn?: number;
  fanIn?: number;
  complexity?: number;
  addedLines?: number;
  removedLines?: number;
  pastFindings?: number;
}

export interface RadarPrediction {
  file: string;
  title: string;
  failure: string;
  probability: number;
  severity: string;
  evidence: string[];
  mitigation: string;
}

export interface RadarCoverage {
  twin: boolean;
  churn: boolean;
  pastFindings: number;
  aiUsed: boolean;
  aiNote?: string;
}

export interface RadarVerdict {
  mode: RadarMode;
  overallRisk: number;
  staticRisk: number;
  aiRisk: number;
  summary: string;
  riskyFiles: RiskyFile[];
  predictions: RadarPrediction[];
  coverage: RadarCoverage;
  generatedAt: string;
  aiModel: string;
  title: string;
}

export interface RadarReport extends RadarVerdict {
  id: string;
  owner: string;
  repo: string;
  ref: string;
  inputSummary: string;
  createdAt: string;
}

export type RiskBands = "critical" | "high" | "elevated" | "moderate" | "low";

export function riskBand(score: number): RiskBands {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "elevated";
  if (score >= 20) return "moderate";
  return "low";
}

export function riskColor(score: number): string {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  if (score >= 20) return "#3b82f6";
  return "#22c55e";
}
