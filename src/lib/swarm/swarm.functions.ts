// AI Developer Swarm server functions: orchestrates Architect → Developer →
// Security (gate) → Tester → Reviewer over real repository data, persists the
// run, and offers an approval-gated escape hatch that writes approved patches
// to a NEW branch on GitHub.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiStatus } from "../ai.server";
import { assertRepo, githubRaw, requireToken, safeRef } from "../github.server";
import { getOrBuildTwin } from "../twin/twin.server";
import type { TwinGraph } from "../twin/twin-types";
import { consumeApproved, createApprovalRow } from "../approvals.server";
import { commitFilesToBranch, createBranchFrom, getHeadSha } from "../github-write.server";
import {
  architectPlan,
  developerPatch,
  reviewerVerdict,
  securityReview,
  selectContextFiles,
  testerPlan,
} from "./swarm-agents";
import type {
  FilePatch,
  SwarmArtifacts,
  SwarmRun,
  SwarmVerdict,
  TranscriptEntry,
} from "./swarm-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

const MAX_CONTEXT_CHARS = 10_000;

function mapRun(row: Record<string, unknown>): SwarmRun {
  return {
    id: String(row.id),
    owner: String(row.owner),
    repo: String(row.repo),
    ref: String(row.ref),
    task: String(row.task),
    status: String(row.status),
    transcript: ((row.transcript as TranscriptEntry[] | null) ?? []) as TranscriptEntry[],
    artifacts: ((row.artifacts ?? {}) as SwarmArtifacts) ?? {},
    verdict: (row.verdict as SwarmVerdict | null) ?? null,
    model: String(row.model ?? ""),
    error: (row.error as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function persistRun(
  supabase: SupabaseClient<Database>,
  id: string,
  fields: {
    status?: string;
    transcript?: TranscriptEntry[];
    artifacts?: SwarmArtifacts;
    verdict?: SwarmVerdict | null;
    model?: string;
    error?: string | null;
  },
) {
  await supabase
    .from("swarm_runs")
    .update({
      ...(fields.status ? { status: fields.status } : {}),
      ...(fields.transcript ? { transcript: fields.transcript as unknown as Json } : {}),
      ...(fields.artifacts ? { artifacts: fields.artifacts as unknown as Json } : {}),
      ...(fields.verdict !== undefined ? { verdict: fields.verdict as unknown as Json } : {}),
      ...(fields.model ? { model: fields.model } : {}),
      ...(fields.error !== undefined ? { error: fields.error } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export const runSwarm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { owner: string; repo: string; ref: string; task: string }) => {
    assertRepo(input.owner, input.repo);
    const task = (input.task ?? "").trim();
    if (task.length < 12) throw new Error("Describe the task in at least 12 characters.");
    if (task.length > 2000) throw new Error("Keep the task under 2,000 characters.");
    return {
      owner: input.owner,
      repo: input.repo,
      ref: safeRef(input.ref || "main").slice(0, 250),
      task,
    };
  })
  .handler(async ({ data, context }): Promise<SwarmRun> => {
    const token = await requireToken(context.userId);
    const transcript: TranscriptEntry[] = [];
    const artifacts: SwarmArtifacts = { contextFiles: [] };
    let model = "";

    const { data: row, error: createError } = await context.supabase
      .from("swarm_runs")
      .insert({
        user_id: context.userId,
        owner: data.owner,
        repo: data.repo,
        ref: data.ref,
        task: data.task,
        status: "running",
      })
      .select()
      .single();
    if (createError || !row) {
      console.error("Failed to create swarm run", createError);
      throw new Error("Could not start the swarm run.");
    }
    const runId = String(row.id);

    const say = (entry: TranscriptEntry) => {
      transcript.push(entry);
    };
    const flush = async (status?: string) => {
      await persistRun(context.supabase, runId, { transcript, artifacts, status });
    };

    try {
      // 0) Build real repository context from the twin graph.
      say({
        role: "system",
        ts: new Date().toISOString(),
        message: `Preparing repository context for ${data.owner}/${data.repo}@${data.ref}.`,
      });
      await flush();

      let twinGraph: TwinGraph | null = null;
      try {
        const twin = await getOrBuildTwin(
          context.supabase,
          context.userId,
          token,
          data.owner,
          data.repo,
          data.ref,
        );
        twinGraph = twin.snapshot?.graph ?? null;
      } catch (error) {
        say({
          role: "system",
          ts: new Date().toISOString(),
          message: `Twin context unavailable: ${error instanceof Error ? error.message : "unknown error"}. Continuing without graph context.`,
        });
      }

      const selected = selectContextFiles(twinGraph, data.task, 10);
      const fileContents: Array<{ path: string; content: string }> = [];
      for (const option of selected.slice(0, 6)) {
        try {
          const content = await githubRaw(
            token,
            `repos/${data.owner}/${data.repo}/contents/${option.path}`,
            "application/vnd.github.raw",
          );
          if (content.length > MAX_CONTEXT_CHARS * 2) continue;
          fileContents.push({ path: option.path, content: content.slice(0, MAX_CONTEXT_CHARS) });
          artifacts.contextFiles.push({ path: option.path, chars: content.length, included: true });
        } catch {
          artifacts.contextFiles.push({ path: option.path, chars: option.loc, included: false });
        }
      }
      const twinSummary = [
        `Endpoints (${twinGraph?.nodes.filter((n) => n.kind === "endpoint").length ?? 0}):`,
        ...(twinGraph?.nodes
          .filter((n) => n.kind === "endpoint")
          .slice(0, 12)
          .map((node) => `  ${node.label}`) ?? []),
        `DB tables (${twinGraph?.nodes.filter((n) => n.kind === "db").length ?? 0}): ${
          twinGraph?.nodes
            .filter((n) => n.kind === "db")
            .map((node) => node.label)
            .join(", ") ?? "none"
        }`,
        `Packages: ${
          twinGraph?.nodes
            .filter((n) => n.kind === "package")
            .map((node) => node.label)
            .join(", ") ?? "unknown"
        }`,
        `Top files: ${selected.map((file) => file.path).join(", ")}`,
      ].join("\n");
      const contextSummary = `${twinSummary}\n\n${fileContents.map((file) => `=== ${file.path} ===\n${file.content}`).join("\n\n")}`;

      model = aiStatus().model;
      await persistRun(context.supabase, runId, { model });

      // 1) Architect
      say({
        role: "architect",
        ts: new Date().toISOString(),
        message: "Designing the change plan…",
      });
      await flush("architect");
      const plan = await architectPlan(data.task, contextSummary.slice(0, 24_000));
      artifacts.plan = plan;
      say({
        role: "architect",
        ts: new Date().toISOString(),
        message: `Plan ready: ${plan.steps.length} steps, ${plan.filesToModify.length} target files.`,
        artifacts: ["plan"],
      });
      await flush();

      // 2) Developer + Security gate loop (max 2 revisions)
      let security: Awaited<ReturnType<typeof securityReview>> | null = null;
      let patches: FilePatch[] = [];
      let rationale = "";
      const secTargets = plan.filesToModify.length
        ? plan.filesToModify
        : fileContents.map((file) => file.path).slice(0, 4);
      const focusedContents = fileContents.filter(
        (file) => secTargets.includes(file.path) || patches.length === 0,
      );

      for (let iteration = 0; iteration < 3; iteration++) {
        const previous =
          security && !security.approvable && security.instructions.length
            ? { path: patches[0]?.path ?? "", feedback: security.instructions.join("\n") }
            : undefined;
        say({
          role: "developer",
          ts: new Date().toISOString(),
          message: previous ? "Revising patch after security feedback." : "Writing the patch…",
        });
        await flush("developer");
        const built = await developerPatch(
          data.task,
          plan,
          focusedContents.length ? focusedContents : fileContents,
          previous,
        );
        patches = built.patches;
        rationale = built.rationale;
        say({
          role: "developer",
          ts: new Date().toISOString(),
          message: rationale || `Patch ready: ${patches.length} file(s).`,
          artifacts: ["patches"],
        });
        artifacts.patches = patches;
        await flush();

        say({
          role: "security",
          ts: new Date().toISOString(),
          message: "Security gate reviewing patch…",
        });
        await flush("security");
        security = await securityReview(patches, plan, data.task, iteration);
        artifacts.security = security;
        say({
          role: "security",
          ts: new Date().toISOString(),
          message: security.approvable
            ? `Gate passed (${security.findings.length} note(s)).`
            : `Blocked: ${security.findings.filter((finding) => ["critical", "high"].includes(finding.severity)).length} blocking finding(s).`,
          artifacts: ["security"],
        });
        await flush();
        if (security.approvable || iteration === 2) break;
      }

      // 3) Tester
      say({
        role: "tester",
        ts: new Date().toISOString(),
        message: "Preparing verification plan…",
      });
      await flush("tester");
      const tests = await testerPlan(data.task, plan, patches, twinSummary);
      artifacts.tests = tests;
      say({
        role: "tester",
        ts: new Date().toISOString(),
        message: `${tests.cases.length} test cases · ${tests.commands.length} verification commands.`,
        artifacts: ["tests"],
      });
      await flush();

      // 4) Reviewer
      say({ role: "reviewer", ts: new Date().toISOString(), message: "Final review…" });
      const verdict = await reviewerVerdict(
        data.task,
        plan,
        patches,
        security ?? { approvable: true, iterations: 0, findings: [], instructions: [] },
        tests,
      );
      artifacts.branchName = `codepilot/${data.repo}-${runId.slice(0, 8)}`;
      say({
        role: "reviewer",
        ts: new Date().toISOString(),
        message: `${verdict.verdict} (confidence ${verdict.confidence}%). ${verdict.summary}`,
      });

      const status = verdict.verdict === "reject" ? "rejected" : "complete";
      await persistRun(context.supabase, runId, {
        status,
        transcript,
        artifacts,
        verdict,
        model,
        error: null,
      });

      return {
        id: runId,
        owner: data.owner,
        repo: data.repo,
        ref: data.ref,
        task: data.task,
        status,
        transcript,
        artifacts,
        verdict,
        model,
        error: null,
        createdAt: String(row.created_at),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Swarm run failed.";
      say({ role: "system", ts: new Date().toISOString(), message: `Run failed: ${message}` });
      await persistRun(context.supabase, runId, {
        status: "failed",
        transcript,
        artifacts,
        model,
        error: message,
      });
      const failed = await context.supabase.from("swarm_runs").select().eq("id", runId).single();
      return mapRun(failed.data ?? {});
    }
  });

/* ---------- approval-gated patch delivery ---------- */

export interface SwarmCommitPayload {
  runId: string;
  owner: string;
  repo: string;
  ref: string;
  branch: string;
  message: string;
  files: Array<{ path: string; content: string }>;
}

export async function buildSwarmCommitPayload(
  supabase: SupabaseClient<Database>,
  runId: string,
): Promise<SwarmCommitPayload> {
  const { data: row } = await supabase.from("swarm_runs").select().eq("id", runId).maybeSingle();
  if (!row) throw new Error("Swarm run not found.");
  const artifacts = ((row.artifacts ?? {}) as unknown as SwarmArtifacts) ?? {};
  const patches = artifacts.patches ?? [];
  if (!patches.length) throw new Error("This run has no approved patch artifacts.");
  const branch = `codepilot/${row.repo}-${String(row.id).slice(0, 8)}`;
  return {
    runId: String(row.id),
    owner: String(row.owner),
    repo: String(row.repo),
    ref: String(row.ref),
    branch,
    message: `CodePilot AI swarm patch for task on ${row.repo} (run ${String(row.id).slice(0, 8)})`,
    files: patches.map((patch) => ({ path: patch.path, content: patch.after })),
  };
}

export const requestSwarmBranchApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { runId: string }) => input)
  .handler(async ({ data, context }) => {
    const payload = await buildSwarmCommitPayload(context.supabase, data.runId);
    return createApprovalRow(context.supabase, context.userId, {
      kind: "swarm.create-branch",
      title: `Create branch ${payload.branch} with ${payload.files.length} patched file(s)`,
      risk: "high",
      payload,
    });
  });

export const createSwarmBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { runId: string; approvalId: string }) => input)
  .handler(async ({ data, context }) => {
    const token = await requireToken(context.userId);
    const payload = await buildSwarmCommitPayload(context.supabase, data.runId);
    // One-time, digest-verified human approval is mandatory here.
    await consumeApproved(context.supabase, data.approvalId, "swarm.create-branch", payload);

    const headSha = await getHeadSha(token, payload.owner, payload.repo, payload.ref);
    if (!headSha) throw new Error("Could not read the base branch head.");
    const created = await createBranchFrom(
      token,
      payload.owner,
      payload.repo,
      headSha,
      payload.branch,
    );
    const files = payload.files.filter((file) => file.path && typeof file.content === "string");
    const committed = await commitFilesToBranch(
      token,
      payload.owner,
      payload.repo,
      payload.branch,
      created,
      files,
      payload.message,
    );
    return {
      branch: committed.branch,
      commitSha: committed.commitSha,
      url: `https://github.com/${payload.owner}/${payload.repo}/compare/${committed.branch}?expand=1`,
    };
  });

export const getSwarmRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<SwarmRun> => {
    const { data: row, error } = await context.supabase
      .from("swarm_runs")
      .select()
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Swarm run not found.");
    return mapRun(row as unknown as Record<string, unknown>);
  });

export const listSwarmRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SwarmRun[]> => {
    const { data, error } = await context.supabase
      .from("swarm_runs")
      .select()
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      console.error("Failed to list swarm runs", error);
      return [];
    }
    return (data ?? []).map((row) => mapRun(row as unknown as Record<string, unknown>));
  });
