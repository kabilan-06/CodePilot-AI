// Predictive Bug Radar server functions. Combines measurable repository
// signals (churn, fan-in from the twin graph, complexity, diff size, past
// review findings) with LLM failure-mode predictions that must cite evidence.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiComplete, parseAiJson } from "../ai.server";
import { assertRepo, githubFetch, githubRaw, requireToken, safeRef } from "../github.server";
import { getOrBuildTwin } from "../twin/twin.server";
import { parseUnifiedDiff, excerptFor } from "./diff";
import { computeFileRisk, countRiskyTokens } from "./risk-model";
import type {
  RadarCoverage,
  RadarMode,
  RadarPrediction,
  RadarReport,
  RadarVerdict,
  RiskyFile,
} from "./radar-types";

interface RadarInput {
  owner: string;
  repo: string;
  ref: string;
  mode: RadarMode;
  prNumber?: number;
  commitSha?: string;
  diff?: string;
  title?: string;
}

const AI_SYSTEM = `You are Predictive Bug Radar, a failure-mode analyst.
Given transparent static risk signals and changed code excerpts from a real repository, predict concrete, likely failures.
Respond with ONLY JSON: {
  "aiRisk": 0-100 integer (overall risk of the change set failing in production),
  "overallAssessment": "2-3 sentence assessment grounded in the evidence",
  "predictions": [ { "file": "repo path", "title": "short failure title", "failure": "one-paragraph failure description", "probability": 0-100, "severity": "critical|high|medium|low", "evidence": ["exact quoted code line(s) that support this, <=140 chars", ...], "mitigation": "concrete mitigation" } ]
}
Rules: every prediction MUST cite at least one exact line from the provided excerpts. Max 8 predictions, most likely first. If evidence does not support a failure, omit that prediction.`;

export const runRadarScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: RadarInput) => {
    assertRepo(input.owner, input.repo);
    const mode = (["full-repo", "pr", "commit", "diff"] as const).includes(input.mode)
      ? input.mode
      : "full-repo";
    const diff = (input.diff ?? "").slice(0, 80_000);
    if (mode === "pr" && !(Number.isInteger(input.prNumber) && (input.prNumber ?? 0) > 0)) {
      throw new Error("A valid pull request number is required.");
    }
    if (mode === "commit" && !(input.commitSha ?? "").trim()) {
      throw new Error("A commit SHA (or A..B range) is required.");
    }
    if (mode === "diff" && (diff ?? "").trim().length < 20) {
      throw new Error("Paste at least 20 characters of the diff.");
    }
    return {
      owner: input.owner,
      repo: input.repo,
      ref: safeRef(input.ref || "main").slice(0, 250),
      mode,
      prNumber: input.prNumber,
      commitSha: input.commitSha,
      diff,
      title: (input.title ?? "").trim().slice(0, 120) || undefined,
    };
  })
  .handler(async ({ data, context }): Promise<RadarReport> => {
    const token = await requireToken(context.userId);
    const warnings: string[] = [];
    const coverage: RadarCoverage = { twin: false, churn: false, pastFindings: 0, aiUsed: false };

    // Twin graph supplies fan-in metrics (built once, cached by tree SHA).
    let twinNodes: Array<{ path?: string; fanIn: number; complexity?: number; loc: number }> = [];
    try {
      const twin = await getOrBuildTwin(
        context.supabase,
        context.userId,
        token,
        data.owner,
        data.repo,
        data.ref,
      );
      if (twin.snapshot) {
        coverage.twin = true;
        twinNodes = twin.snapshot.graph.nodes.filter((n) => n.kind === "file") as Array<{
          path?: string;
          fanIn: number;
          complexity?: number;
          loc: number;
        }>;
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Twin metrics unavailable.");
    }
    const pathMetrics = new Map(
      twinNodes.filter((node) => node.path).map((node) => [node.path as string, node]),
    );

    // Past findings from the user's own review history.
    const pastByBase = new Map<string, number>();
    try {
      const { data: reviews } = await context.supabase
        .from("reviews")
        .select("issues")
        .order("created_at", { ascending: false })
        .limit(120);
      for (const review of reviews ?? []) {
        const issues =
          (review.issues as Array<{ title?: string; explanation?: string }> | null) ?? [];
        for (const issue of issues) {
          const text = `${issue.title ?? ""} ${issue.explanation ?? ""}`;
          if (!text) continue;
          for (const [base] of extractPaths(text)) {
            pastByBase.set(base, (pastByBase.get(base) ?? 0) + 1);
          }
        }
      }
      coverage.pastFindings = pastByBase.size;
    } catch {
      warnings.push("Could not read review history for defect density.");
    }

    const candidates: RiskyFile[] = [];
    let inputSummary = "";

    if (data.mode === "diff" || data.mode === "pr" || data.mode === "commit") {
      let diffText = "";
      if (data.mode === "diff") {
        diffText = data.diff ?? "";
      } else if (data.mode === "pr") {
        const number = Math.floor(Number(data.prNumber ?? 0));
        diffText = await githubRaw(
          token,
          `repos/${data.owner}/${data.repo}/pulls/${number}`,
          "application/vnd.github.diff",
        );
      } else {
        const sha = safeRef((data.commitSha ?? "").trim());
        const rangeSha = sha.includes("..") ? sha : undefined;
        diffText = rangeSha
          ? await githubRaw(
              token,
              `repos/${data.owner}/${data.repo}/compare/${rangeSha}`,
              "application/vnd.github.diff",
            )
          : await githubRaw(
              token,
              `repos/${data.owner}/${data.repo}/commits/${sha}`,
              "application/vnd.github.diff",
            );
      }

      const parsed = parseUnifiedDiff(diffText)
        .filter((file) => !file.binary)
        .sort((a, b) => b.added + b.removed - (a.added + a.removed))
        .slice(0, 30);
      inputSummary =
        data.mode === "pr"
          ? `PR diff: ${parsed.length} files`
          : data.mode === "commit"
            ? `Commit diff: ${parsed.length} files`
            : `Pasted diff: ${parsed.length} files`;

      for (const file of parsed) {
        const metrics = pathMetrics.get(file.path);
        const changedText = file.hunks
          .map((hunk) => hunk.lines.map((l) => l.text).join("\n"))
          .join("\n");
        const riskyTokens = countRiskyTokens(changedText);
        const ranked = computeFileRisk({
          path: file.path,
          addedLines: file.added,
          removedLines: file.removed,
          fanIn: metrics?.fanIn,
          complexity: metrics?.complexity,
          pastFindings: pastByBase.get(file.path.split("/").pop() ?? file.path),
        });
        if (riskyTokens.length)
          ranked.reasons.push(...riskyTokens.map((token) => `flagged: ${token}`));
        candidates.push(ranked);
      }
    } else {
      // full-repo mode: rank the whole tree from twin metrics + history.
      inputSummary = `Full repository scan (${twinNodes.length} files)`;
      const ranked = twinNodes
        .map((node) => ({
          node,
          weight: (node.complexity ?? 0) * 2 + node.fanIn * 3 + (node.loc ?? 0) / 400,
        }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 20);
      for (const { node } of ranked) {
        if (!node.path) continue;
        candidates.push(
          computeFileRisk({
            path: node.path,
            loc: node.loc,
            fanIn: node.fanIn,
            complexity: node.complexity,
            pastFindings: pastByBase.get(node.path.split("/").pop() ?? node.path),
          }),
        );
      }
    }

    candidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
    const topFiles = candidates.slice(0, 12);

    // GitHub churn: distinct commits in the last 30 days per path (capped).
    const churnPaths = topFiles.slice(0, 6).map((file) => file.path);
    if (churnPaths.length) {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const results = await Promise.allSettled(
        churnPaths.map((path) =>
          githubFetch<Array<unknown>>(
            token,
            `repos/${data.owner}/${data.repo}/commits?per_page=30&sha=${encodeURIComponent(data.ref)}&since=${since}&path=${encodeURIComponent(path)}`,
          ),
        ),
      );
      let churnAvailable = false;
      for (let i = 0; i < churnPaths.length; i++) {
        const result = results[i];
        if (result.status === "fulfilled" && Array.isArray(result.value)) {
          const file = topFiles.find((entry) => entry.path === churnPaths[i]);
          if (file && result.value.length >= 1) {
            churnAvailable = true;
            file.churn = Math.min(result.value.length, 30);
            const refreshed = computeFileRisk({
              path: file.path,
              churn: file.churn,
              fanIn: file.fanIn,
              complexity: file.complexity,
              addedLines: file.addedLines,
              removedLines: file.removedLines,
              pastFindings: file.pastFindings,
            });
            file.score = refreshed.score;
            file.reasons = refreshed.reasons.concat(
              file.reasons.filter((r) => r.startsWith("flagged:")),
            );
          }
        }
      }
      candidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
      topFiles.length = 0;
      topFiles.push(...candidates.slice(0, 12));
      coverage.churn = churnAvailable;
    }

    // AI failure-mode predictions with evidence.
    const top6 = topFiles.slice(0, 6);
    const predictions: RadarPrediction[] = [];
    let aiRisk = topFiles[0]?.score ?? 0;
    let summary = "";
    let aiModel = "";

    if (top6.length > 0) {
      const contextBlocks = top6
        .map((file) => {
          const excerpt =
            data.mode === "full-repo"
              ? "(no diff — full-file risk)"
              : excerptFor(
                  parseUnifiedDiff(data.diff ?? "").find((f) => f.path === file.path) ?? {
                    path: file.path,
                    oldPath: null,
                    binary: false,
                    added: 0,
                    removed: 0,
                    hunks: [],
                  },
                );
          return [
            `FILE ${file.path} (static risk ${file.score}/100)`,
            file.reasons.map((reason) => `- ${reason}`).join("\n"),
            "CHANGED LINES:",
            excerpt,
          ].join("\n");
        })
        .join("\n\n");

      try {
        const response = await aiComplete({
          json: true,
          messages: [
            { role: "system", content: AI_SYSTEM },
            {
              role: "user",
              content: `Repository: ${data.owner}/${data.repo}@${data.ref}\nMode: ${data.mode} (${inputSummary})\n\nSignals and excerpts:\n${contextBlocks}`,
            },
          ],
          maxTokens: 2600,
        });
        aiModel = response.model;
        const parsed = parseAiJson<{
          aiRisk?: number;
          overallAssessment?: string;
          predictions?: RadarPrediction[];
        }>(response.content);
        aiRisk = clampScore(parsed.aiRisk ?? aiRisk);
        summary = String(parsed.overallAssessment ?? "").slice(0, 600);
        for (const prediction of parsed.predictions ?? []) {
          predictions.push({
            file: String(prediction.file ?? ""),
            title: String(prediction.title ?? "Failure"),
            failure: String(prediction.failure ?? ""),
            probability: clampScore(prediction.probability),
            severity: String(prediction.severity ?? "medium"),
            evidence: Array.isArray(prediction.evidence)
              ? prediction.evidence.slice(0, 4).map(String)
              : [],
            mitigation: String(prediction.mitigation ?? ""),
          });
        }
        coverage.aiUsed = true;
        coverage.aiNote = undefined;
      } catch (error) {
        coverage.aiNote = error instanceof Error ? error.message : "AI analysis unavailable.";
        warnings.push(coverage.aiNote);
        summary = "Static radar only — AI service unavailable.";
      }
    } else {
      summary = "No sufficiently risky files detected in this scan.";
    }

    const topFive = topFiles.slice(0, 5);
    const staticRisk =
      topFive.length > 0
        ? Math.round(
            (topFive[0].score + topFive.reduce((sum, f) => sum + f.score, 0) / topFive.length) / 2,
          )
        : 0;
    const overallRisk = coverage.aiUsed
      ? clampScore(Math.round(staticRisk * 0.6 + aiRisk * 0.4))
      : staticRisk;

    const verdict: RadarVerdict = {
      mode: data.mode,
      overallRisk,
      staticRisk,
      aiRisk,
      summary: summary || `Static analysis across ${candidates.length} files.`,
      riskyFiles: topFiles,
      predictions: predictions.slice(0, 8),
      coverage: {
        ...coverage,
        pastFindings: coverage.pastFindings > 0 ? coverage.pastFindings : 0,
      },
      generatedAt: new Date().toISOString(),
      aiModel,
      title: data.title?.slice(0, 120) ?? `${data.mode} radar · ${data.repo}`,
    };
    if (warnings.length) {
      verdict.coverage.aiNote = verdict.coverage.aiNote ?? warnings.join(" · ");
    }

    const { data: saved, error } = await context.supabase
      .from("radar_reports")
      .insert({
        user_id: context.userId,
        owner: data.owner,
        repo: data.repo,
        ref: data.ref,
        mode: data.mode,
        input_summary: inputSummary,
        overall_risk: verdict.overallRisk,
        verdict: verdict as unknown as Record<string, never>,
      })
      .select("id, created_at")
      .single();
    if (error || !saved) {
      console.error("Failed to save radar report", error);
      throw new Error("Radar scan completed but could not be saved.");
    }

    return {
      ...verdict,
      id: String(saved.id),
      owner: data.owner,
      repo: data.repo,
      ref: data.ref,
      inputSummary,
      createdAt: String(saved.created_at),
      aiModel: aiModel || verdict.aiModel,
    } satisfies RadarReport;
  });

export const listRadarReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RadarReport[]> => {
    const { data, error } = await context.supabase
      .from("radar_reports")
      .select()
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      console.error("Failed to list radar reports", error);
      return [];
    }
    return (data ?? []).map((row) => {
      const verdict = (row.verdict ?? {}) as unknown as RadarVerdict;
      return {
        ...verdict,
        id: String(row.id),
        owner: String(row.owner),
        repo: String(row.repo),
        ref: String(row.ref),
        mode: (row.mode as unknown as RadarMode) ?? verdict.mode,
        createdAt: String(row.created_at),
        inputSummary: String(row.input_summary ?? ""),
      };
    });
  });

export const getRadarReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<RadarReport> => {
    const { data: row, error } = await context.supabase
      .from("radar_reports")
      .select()
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Report not found.");
    const verdict = (row.verdict ?? {}) as unknown as RadarVerdict;
    return {
      ...verdict,
      id: String(row.id),
      owner: String(row.owner),
      repo: String(row.repo),
      ref: String(row.ref),
      mode: (row.mode as unknown as RadarMode) ?? verdict.mode,
      createdAt: String(row.created_at),
      inputSummary: String(row.input_summary ?? ""),
    };
  });

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 40;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function extractPaths(text: string): Array<[string]> {
  const paths = text.match(/[A-Za-z0-9_\-./@]+\.[a-z]{1,4}/g) ?? [];
  return Array.from(new Set(paths))
    .slice(0, 6)
    .map((path) => [path] as [string]);
}
