// Transparent, evidence-based static risk scoring. Pure function of measurable
// inputs — no AI, no network. Every score component carries a human-readable
// reason so the radar never emits an unexplainable number.

import type { RiskyFile } from "./radar-types";

export interface RiskSignals {
  path: string;
  /** Distinct commits touching this file in the last 30 days. */
  churn?: number;
  /** Number of files that import/reference this file (from the twin graph). */
  fanIn?: number;
  /** Branch/condition count measured by the twin analyzer. */
  complexity?: number;
  addedLines?: number;
  removedLines?: number;
  /** Count of past review findings that referenced this file. */
  pastFindings?: number;
  /** LOC of the current version (used in full-repo mode). */
  loc?: number;
  /** Potential risk tokens spotted in current or changed content. */
  riskyTokens?: string[];
}

const WEIGHTS = {
  churn: 30,
  complexity: 20,
  fanIn: 20,
  size: 15,
  pastFindings: 15,
} as const;

const TOKEN_LIMIT = 10;

export function countRiskyTokens(content: string): string[] {
  const found: string[] = [];
  const checks: Array<[RegExp, string]> = [
    [/\b(TODO|FIXME|HACK|XXX)\b/, "TODO/FIXME marker"],
    [/\b(eval|exec)\s*\(/, "dynamic eval/exec"],
    [/password|passwd|secret|api[_-]?key|access[_-]?token/i, "hardcoded credential reference"],
    [/AKIA[0-9A-Z]{16}/, "AWS key literal"],
    [/\bany\b(?=\s*[),;>])/, "typescript `any` escape"],
    [/\b(as\s+unknown\s+as)\b/, "double type cast"],
    [/\b(catch|except)\s*(\([^)]*\))?\s*\{\s*\}/, "swallowed error"],
    [/disable.*eslint|eslint-disable|noqa\b|#\s*type:\s*ignore/, "suppressed linter"],
    [/\b(correlated|dangerouslySetInnerHTML)\b/, "raw HTML injection vector"],
  ];
  for (const [regex, label] of checks) {
    if (regex.test(content)) found.push(label);
  }
  return found.slice(0, 4);
}

/**
 * Scores one file 0–100 from raw signals. All weights are host-configured and
 * reasons describe exactly which component contributed how much.
 */
export function computeFileRisk(signals: RiskSignals): RiskyFile {
  const reasons: string[] = [];
  let score = 0;

  if (signals.churn != null) {
    const contribution = Math.min(WEIGHTS.churn, (signals.churn / 10) * WEIGHTS.churn);
    if (signals.churn >= 3) {
      reasons.push(`${signals.churn} commits in the last 30 days (+${contribution.toFixed(0)})`);
      score += contribution;
    }
  }
  if (signals.complexity != null) {
    if (signals.complexity >= 10) {
      const contribution = Math.min(
        WEIGHTS.complexity,
        (signals.complexity / 25) * WEIGHTS.complexity,
      );
      reasons.push(`branching complexity ${signals.complexity} (+${contribution.toFixed(0)})`);
      score += contribution;
    }
  }
  if (signals.fanIn != null) {
    if (signals.fanIn >= 3) {
      const contribution = Math.min(WEIGHTS.fanIn, (signals.fanIn / 8) * WEIGHTS.fanIn);
      reasons.push(
        `imported by ${signals.fanIn} files — blast radius (+${contribution.toFixed(0)})`,
      );
      score += contribution;
    }
  }
  if (signals.addedLines != null) {
    const delta = signals.addedLines + (signals.removedLines ?? 0);
    if (delta >= 20) {
      const contribution = Math.min(WEIGHTS.size, (delta / 120) * WEIGHTS.size);
      reasons.push(
        `diff touches ${signals.addedLines}+/−${signals.removedLines ?? 0} lines (+${contribution.toFixed(0)})`,
      );
      score += contribution;
    }
  } else if (signals.loc != null && signals.loc >= 250) {
    const contribution = Math.min(WEIGHTS.size, (signals.loc / 600) * WEIGHTS.size);
    reasons.push(`large file (${signals.loc} lines) (+${contribution.toFixed(0)})`);
    score += contribution;
  }
  if (signals.pastFindings != null && signals.pastFindings > 0) {
    const contribution = Math.min(
      WEIGHTS.pastFindings,
      (signals.pastFindings / 3) * WEIGHTS.pastFindings,
    );
    reasons.push(
      `${signals.pastFindings} findings in your review history (+${contribution.toFixed(0)})`,
    );
    score += contribution;
  }
  if (signals.riskyTokens && signals.riskyTokens.length > 0) {
    const contribution = Math.min(TOKEN_LIMIT, signals.riskyTokens.length * 3);
    reasons.push(`risk tokens: ${signals.riskyTokens.join(", ")} (+${contribution.toFixed(0)})`);
    score += contribution;
  }

  const finalScore = Math.round(Math.max(0, Math.min(100, score)));
  return {
    path: signals.path,
    score: finalScore,
    maxScore: 100,
    reasons,
    churn: signals.churn,
    fanIn: signals.fanIn,
    complexity: signals.complexity,
    addedLines: signals.addedLines,
    removedLines: signals.removedLines,
    pastFindings: signals.pastFindings,
  };
}

export const RISK_WEIGHTS = WEIGHTS;
