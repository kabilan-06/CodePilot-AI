// AI Developer Swarm — role prompts, context selection, one LLM call wrapper
// and the orchestrated pipeline. Every agent gets real repository data.

import { aiComplete, parseAiJson } from "../ai.server";
import type { FilePatch, SecurityFindings, SwarmPlan, SwarmVerdict, TestPlan } from "./swarm-types";
import type { TwinGraph } from "../twin/twin-types";

export const ARCHITECT_SYSTEM = `You are the Swarm Architect: a senior software architect planning real changes to a real repository.
Respond ONLY with JSON: {
  "objectives": ["..."], "steps": ["ordered implementation steps"], "filesToModify": ["repo-relative paths that must change"], "risks": ["..."]
}
Ground every step in the provided repository context (files, endpoints, tables). Max 6 steps, max 8 files.`;

export const DEVELOPER_SYSTEM = `You are the Swarm Developer: a senior engineer writing exact code changes.
You receive the plan and the CURRENT content of target files. Produce patches as full replacement file contents.
Respond ONLY with JSON: {
  "rationale": "1-3 sentences",
  "patches": [ { "path": "repo path", "before": "exact current file content (copy verbatim from CONTEXT; empty string for new files)", "after": "full new file content" } ]
}
Rules: for modified files, "before" MUST be the complete current content exactly as provided. Keep "after" consistent with the repo's existing style and language. No markdown fences anywhere inside JSON values.`;

export const SECURITY_SYSTEM = `You are the Swarm Security agent: an application security gate.
Review the proposed patches. Respond ONLY with JSON: {
  "approvable": boolean, "iterations": 0, "findings": [ { "severity": "critical|high|medium|low", "title": "...", "detail": "...", "file": "path" } ], "instructions": ["precise fix instructions for the developer, empty when approvable"]
}
Block for critical/high severity: injection (SQL/command/XSS), auth bypass, secrets in code, destructive data ops, broken authz checks, obvious logic regressions. Approve only medium/low.`;

export const TESTER_SYSTEM = `You are the Swarm Tester: a senior QA engineer.
Respond ONLY with JSON: {
  "strategy": "1-2 sentence test strategy", "cases": [ { "name": "...", "description": "...", "expected": "..." } ], "commands": ["shell commands a CI sandbox could run to verify this change, e.g. npm test -- path"], "expectedResults": "what passing output should show"
}
Write 3-6 test cases covering the changed behavior and at least one regression guard. Commands must be safe, non-interactive, read-only for the repo.`;

export const REVIEWER_SYSTEM = `You are the Swarm Reviewer: the staff engineer who signs off.
Respond ONLY with JSON: {
  "verdict": "approve|approve-with-comments|reject", "confidence": 0-100, "summary": "2-4 sentence final assessment", "followUps": ["..."]
}
Reject when the patch contradicts the plan, security blocked hard, or tests don't cover the change.`;

interface ContextOption {
  path: string;
  score: number;
  loc: number;
}

/** Picks files most relevant to a task using the twin graph metrics + name matching. */
export function selectContextFiles(
  graph: TwinGraph | null,
  task: string,
  limit = 10,
): ContextOption[] {
  const taskLower = task.toLowerCase();
  const tokens = taskLower
    .split(/[^\w@/.-]+/)
    .filter(
      (token) =>
        token.length >= 4 && !["this", "that", "with", "from", "make", "update"].includes(token),
    );

  const scored = (graph?.nodes ?? [])
    .filter((node) => node.kind === "file")
    .map((node) => {
      const path = (node.path ?? "").toLowerCase();
      const label = node.label.toLowerCase();
      let score = node.fanIn * 2 + Math.min(node.loc, 600) / 300;
      for (const token of tokens) {
        if (label.includes(token)) score += 12;
        else if (path.includes(token)) score += 6;
      }
      if (/(api|route|controller|service|handler|endpoint|schema|model)/.test(path)) score += 3;
      if (/(test|spec|__tests__)/.test(path)) score -= 3;
      if (/(readme|changelog|package-lock|tsconfig|config\.ts|vite\.config)/.test(path)) score -= 6;
      return { path: node.path ?? "", score, loc: node.loc };
    })
    .filter((item) => item.path);
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ path, score, loc }) => ({ path, score, loc }));
}

export async function callAgent<T>(
  system: string,
  userContent: string,
): Promise<{ parsed: T; model: string }> {
  const { content, model } = await aiComplete({
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    json: true,
    temperature: 0.2,
    maxTokens: 4000,
  });
  return { parsed: parseAiJson<T>(content) as T, model };
}

const PLAN_EXAMPLE = `{ "objectives": ["..."], "steps": ["1. ..."], "filesToModify": ["src/x.ts"], "risks": ["..."] }`;

export async function architectPlan(task: string, contextSummary: string): Promise<SwarmPlan> {
  const { parsed } = await callAgent<Partial<SwarmPlan>>(
    ARCHITECT_SYSTEM,
    `TASK:\n${task}\n\nREPOSITORY CONTEXT:\n${contextSummary}\n\nPlan the change. JSON shape: ${PLAN_EXAMPLE}`,
  );
  return {
    objectives: (parsed.objectives ?? []).map(String).slice(0, 6),
    steps: (parsed.steps ?? []).map(String).slice(0, 8),
    filesToModify: (parsed.filesToModify ?? []).map(String).slice(0, 8),
    risks: (parsed.risks ?? []).map(String).slice(0, 6),
  };
}

function normalizePatchFile(raw: string): string {
  return raw.replace(/^\\n/, "").replace(/\\+$/g, "");
}

export async function developerPatch(
  task: string,
  plan: SwarmPlan,
  fileContents: Array<{ path: string; content: string }>,
  previousPatch?: { path: string; feedback: string },
): Promise<{ patches: FilePatch[]; rationale: string }> {
  const planText = [
    `OBJECTIVES`,
    ...(plan.objectives ?? []),
    "",
    "STEPS",
    ...(plan.steps ?? []),
  ].join("\n");
  const context = fileContents
    .map((file) => `===== ${file.path} =====\n${file.content.slice(0, 24_000)}`)
    .join("\n\n");

  const revisionNote = previousPatch
    ? `\n\nSECURITY REVISION REQUESTED for ${previousPatch.path}. Previous changes failed review.\nFEEDBACK:\n${previousPatch.feedback}\nApply these instructions while keeping the rest of the change intact.\n`
    : "";

  const { parsed } = await callAgent<{
    rationale?: string;
    patches?: Array<{ path: string; before: string; after: string }>;
  }>(
    DEVELOPER_SYSTEM,
    `TASK:\n${task}\n\nPLAN:\n${planText}\n\nCURRENT POSITION CONTEXT (verbatim files):\n${context}\n${revisionNote}`,
  );

  const known = new Map(fileContents.map((file) => [file.path, file.content]));
  const patches: FilePatch[] = (parsed.patches ?? [])
    .slice(0, 8)
    .filter((patch) => patch && patch.path && typeof patch.after === "string")
    .map((patch) => {
      const before =
        typeof patch.before === "string" && patch.before.length > 0
          ? patch.before
          : (known.get(patch.path) ?? "");
      const expected = known.get(patch.path);
      const verified = expected == null ? true : before.trim() === expected.trim();
      return {
        path: patch.path.trim().replace(/^\/+/, "").slice(0, 300),
        before: normalizePatchFile(before),
        after: patch.after,
        verified,
      };
    });

  return { patches, rationale: String(parsed.rationale ?? "") };
}

export async function securityReview(
  patches: FilePatch[],
  plan: SwarmPlan,
  task: string,
  iteration: number,
): Promise<SecurityFindings> {
  const summary = patches
    .map((patch) => {
      const beforeLines = patch.before.split("\n");
      const afterLines = patch.after.split("\n");
      // Cheap unified-ish summary: first diverging section plus sizes.
      let changeStart = 0;
      while (
        changeStart < Math.min(beforeLines.length, afterLines.length) &&
        beforeLines[changeStart] === afterLines[changeStart]
      ) {
        changeStart += 1;
      }
      const preview = afterLines.slice(changeStart, changeStart + 40).join("\n");
      return `===== ${patch.path} (before ${beforeLines.length}L -> after ${afterLines.length}L) =====\nCHANGED FROM LINE ${changeStart}:\n${preview}`;
    })
    .join("\n\n");

  const { parsed } = await callAgent<Partial<SecurityFindings>>(
    SECURITY_SYSTEM,
    `TASK:\n${task}\n\nPLAN:\n${[...(plan.objectives ?? []), ...(plan.steps ?? [])].join("\n")}\n\nPROPOSED PATCHES:\n${summary || "(no patches)"}`,
  );
  const blocked = (parsed.findings ?? []).some((finding) =>
    ["critical", "high"].includes(String(finding?.severity ?? "").toLowerCase()),
  );
  return {
    approvable: typeof parsed.approvable === "boolean" ? parsed.approvable && !blocked : !blocked,
    iterations: iteration + 1,
    findings: (parsed.findings ?? []).slice(0, 10).map((finding) => ({
      severity: String(finding?.severity ?? "low"),
      title: String(finding?.title ?? ""),
      detail: String(finding?.detail ?? ""),
      file: String(finding?.file ?? ""),
    })),
    instructions: (parsed.instructions ?? []).map(String).slice(0, 6),
  };
}

export async function testerPlan(
  task: string,
  plan: SwarmPlan,
  patches: FilePatch[],
  contextSummary: string,
): Promise<TestPlan> {
  const patchSummary = patches
    .map((patch) => `${patch.path}: ${patch.after.split("\n").length} lines after change`)
    .join("\n");
  const { parsed } = await callAgent<Partial<TestPlan>>(
    TESTER_SYSTEM,
    `TASK:\n${task}\n\nPLAN:\n${[...(plan.objectives ?? []), ...(plan.steps ?? [])].join("\n")}\n\nPATCH SUMMARY:\n${patchSummary}\n\nREPO CONTEXT:\n${contextSummary}`,
  );
  return {
    strategy: String(parsed.strategy ?? ""),
    cases: (parsed.cases ?? []).slice(0, 6).map((testCase) => ({
      name: String(testCase?.name ?? ""),
      description: String(testCase?.description ?? ""),
      expected: String(testCase?.expected ?? ""),
    })),
    commands: (parsed.commands ?? []).map(String).slice(0, 6),
    expectedResults: String(parsed.expectedResults ?? ""),
  };
}

export async function reviewerVerdict(
  task: string,
  plan: SwarmPlan,
  patches: FilePatch[],
  security: SecurityFindings,
  tests: TestPlan,
): Promise<SwarmVerdict> {
  const { parsed } = await callAgent<Partial<SwarmVerdict>>(
    REVIEWER_SYSTEM,
    [
      `TASK:`,
      task,
      ``,
      `PLAN:`,
      [...(plan.objectives ?? []), ...(plan.steps ?? [])].join("\n"),
      ``,
      `PATCHES:`,
      patches
        .map(
          (patch) => `${patch.path} (${patch.verified ? "verified against repo" : "UNVERIFIED"})`,
        )
        .join("\n") || "(none)",
      ``,
      `SECURITY:`,
      security.approvable ? "gate passed" : "SECURITY BLOCKED",
      security.findings.map((finding) => `[${finding.severity}] ${finding.title}`).join("\n"),
      ``,
      `TEST PLAN:`,
      tests.strategy,
      tests.cases.map((testCase) => `- ${testCase.name}: ${testCase.expected}`).join("\n"),
      tests.commands.join("\n"),
    ].join("\n\n"),
  );
  const verdict = String(parsed.verdict ?? "approve-with-comments");
  return {
    verdict: ["approve", "approve-with-comments", "reject"].includes(verdict)
      ? (verdict as SwarmVerdict["verdict"])
      : "approve-with-comments",
    confidence: Math.max(0, Math.min(100, Number(parsed.confidence ?? 60))),
    summary: String(parsed.summary ?? ""),
    followUps: (parsed.followUps ?? []).map(String).slice(0, 6),
  };
}
