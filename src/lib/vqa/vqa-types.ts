// AI Visual QA — shared types.

export interface VqaDefect {
  area: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  recommendation: string;
  confidence: number;
}

export interface VqaAnalysis {
  summary: string;
  defects: VqaDefect[];
  layout: string;
  readability: string;
  contrast: string;
  accessibility: string;
}

export interface DiffSummary {
  ratio: number;
  changedPixels: number;
  regions: Array<{ x: number; y: number; w: number; h: number }>;
  heatmapDataUrl?: string;
}

export interface VqaCheck {
  id: string;
  name: string;
  pass: boolean;
  detail: string;
}

export interface VqaRun {
  id: string;
  mode: "screenshots" | "url";
  targetUrl: string;
  label: string | null;
  analysis: VqaAnalysis | null;
  diff: DiffSummary | null;
  checks: VqaCheck[];
  fetchedBytes: number;
  createdAt: string;
  note: string | null;
}
