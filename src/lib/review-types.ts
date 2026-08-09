export const LANGUAGES = [
  "java",
  "python",
  "javascript",
  "typescript",
  "cpp",
  "csharp",
  "go",
  "rust",
  "php",
  "sql",
  "html",
  "css",
  "react",
  "spring-boot",
] as const;

export type Language = (typeof LANGUAGES)[number];

export const SCORE_KEYS = [
  "performance",
  "security",
  "maintainability",
  "readability",
  "architecture",
  "documentation",
  "testing",
] as const;

export type ScoreKey = (typeof SCORE_KEYS)[number];

export type Scores = Record<ScoreKey, number>;

export const ISSUE_CATEGORIES = [
  "bug-risk",
  "security",
  "performance",
  "memory-leak",
  "code-smell",
  "duplication",
  "naming",
  "clean-code",
  "solid",
  "design-pattern",
  "refactoring",
  "complexity",
  "readability",
  "maintainability",
  "documentation",
  "testing",
  "best-practice",
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export type Severity = "critical" | "high" | "medium" | "low";

export interface ReviewIssue {
  title: string;
  category: IssueCategory | string;
  severity: Severity | string;
  line: number | null;
  explanation: string;
  why_it_matters: string;
  how_to_fix: string;
  improved_code: string;
  alternative: string;
  estimated_improvement: string;
}

export interface ReviewResult {
  title: string;
  grade: "A+" | "A" | "B" | "C" | "D" | string;
  overall_score: number;
  summary: string;
  scores: Scores;
  issues: ReviewIssue[];
}

export interface ReviewRecord extends ReviewResult {
  id: string;
  language: string;
  source: string;
  source_ref: string | null;
  code: string;
  created_at: string;
}

export const SCORE_LABELS: Record<ScoreKey, string> = {
  performance: "Performance",
  security: "Security",
  maintainability: "Maintainability",
  readability: "Readability",
  architecture: "Architecture",
  documentation: "Documentation",
  testing: "Testing",
};

export function gradeFromScore(score: number): ReviewResult["grade"] {
  if (score >= 93) return "A+";
  if (score >= 85) return "A";
  if (score >= 72) return "B";
  if (score >= 60) return "C";
  return "D";
}

export function severityTone(severity: string) {
  switch (severity) {
    case "critical":
    case "high":
      return "text-destructive border-destructive/40 bg-destructive/10";
    case "medium":
      return "text-warning border-warning/40 bg-warning/10";
    default:
      return "text-success border-success/40 bg-success/10";
  }
}
