// Self-Healing server functions. Pipeline: inspect a terminal error → AI root
// cause analysis over real repository files → propose a patch (never applied
// automatically) → sandboxed clone → snapshot → patch → tests → auto-rollback
// on failure → optional approved delivery onto a new branch.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiComplete, aiStatus, parseAiJson } from "../ai.server";
import { assertRepo, githubRaw, requireToken } from "../github.server";
import { getOrBuildTwin } from "../twin/twin.server";
import { selectContextFiles } from "../swarm/swarm-agents";
import { consumeApproved, createApprovalRow } from "../approvals.server";
import { commitFilesToBranch, createBranchFrom, getHeadSha } from "../github-write.server";
import {
  applyPatches,
  createSandboxWorkspace,
  destroyWorkspace,
  detectSandboxCapability,
  guessTestCommand,
  rollbackWorkspaceFiles,
  runCommandInSandbox,
} from "./sandbox.server";
import type { HealPatch, HealRun, Diagnosis, SandboxReport } from "./healing-types";

const ANALYST_SYSTEM = `You are the Self-Healing diagnostician for a broken development environment.
Inspect the terminal error and repository context. Respond ONLY with JSON: {
  "classification": "1-line classification of the error",
  "category": "logic|dependency|config|environment|race|resource|external",
  "rootCause": "paragraph explaining the root cause with file/function references",
  "contributingFactors": ["..."],
  "confidence": 0-100,
  "fileHypotheses": ["repo-relative files that most likely need fixing, max 4"]
}`;

const PATCHER_SYSTEM = `You are the Self-Healing patcher. You receive the root cause diagnosis and the CURRENT content of hypothesized files.
Respond ONLY with JSON: {
  "explain": "1-2 sentences on the fix",
  "patches": [ { "path": "repo path", "before": "exact current full content, copy verbatim; empty string for new files", "after": "full corrected file content" } ]
}
Keep patches minimal: fix the breakage without refactoring unrelated code. No markdown fences inside JSON values.`;

async function loadRun(supabase: SupabaseClient<Database>, id: string): Promise<HealRun | null> {
  const { data } = await supabase.from("heal_runs").select().eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;
  return {
    id: String(row.id),
    owner: (row.owner as string | null) ?? null,
    repo: (row.repo as string | null) ?? null,
    ref: (row.ref as string | null) ?? null,
    errorText: String(row.error_text ?? ""),
    status: String(row.status ?? "diagnosed"),
    diagnosis: (row.diagnosis as Diagnosis | null) ?? null,
    patch: (row.patch as HealPatch[] | null) ?? [],
    sandbox: (row.sandbox as SandboxReport | null) ?? null,
    error: (row.error as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export const sandboxStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const capability = await detectSandboxCapability();
    const ai = aiStatus();
    return { capability, ai };
  });

export const diagnoseError = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { errorText: string; owner?: string; repo?: string; ref?: string }) => {
    const errorText = (input.errorText ?? "").trim();
    if (errorText.length < 20)
      throw new Error("Paste at least 20 characters of the terminal error.");
    if (errorText.length > 8000) throw new Error("Keep the terminal error under 8,000 characters.");
    if (input.owner && input.repo) assertRepo(input.owner, input.repo);
    return {
      errorText,
      owner: input.owner && input.repo ? input.owner : null,
      repo: input.owner && input.repo ? input.repo : null,
      ref: (input.ref || "main").slice(0, 250),
    };
  })
  .handler(async ({ data, context }): Promise<HealRun> => {
    if (!aiStatus().configured) {
      throw new Error("AI is not configured — the healer cannot diagnose without a model.");
    }

    let repoContext = "";
    if (data.owner && data.repo) {
      try {
        const token = await requireToken(context.userId);
        const twin = await getOrBuildTwin(
          context.supabase,
          context.userId,
          token,
          data.owner,
          data.repo,
          data.ref,
        );
        if (twin.snapshot) {
          const top = selectContextFiles(twin.snapshot.graph, data.errorText, 8).map(
            (file) => file.path,
          );
          repoContext = `Repository: ${data.owner}/${data.repo}@${data.ref}\nLikely relevant files: ${top.join(", ")}`;
        }
      } catch {
        repoContext = "(repository context unavailable — diagnosing from the error text alone)";
      }
    }

    const analysis = await aiComplete({
      json: true,
      messages: [
        { role: "system", content: ANALYST_SYSTEM },
        {
          role: "user",
          content: `TERMINAL ERROR:\n${data.errorText}\n\n${repoContext ? `REPO CONTEXT:\n${repoContext}` : ""}`,
        },
      ],
      maxTokens: 1400,
    });
    const parsed = parseAiJson<Partial<Diagnosis>>(analysis.content);
    const diagnosis: Diagnosis = {
      classification: String(parsed.classification ?? "Unclassified error"),
      category: String(parsed.category ?? "logic"),
      rootCause: String(parsed.rootCause ?? ""),
      contributingFactors: (parsed.contributingFactors ?? []).map(String).slice(0, 6),
      confidence: Number.isFinite(Number(parsed.confidence))
        ? Math.max(0, Math.min(100, Number(parsed.confidence)))
        : 40,
      fileHypotheses: (parsed.fileHypotheses ?? []).map(String).slice(0, 4),
    };

    // Fetch hypothesized files for the patcher when a repo is attached.
    const fileContents: Array<{ path: string; content: string }> = [];
    if (data.owner && data.repo && diagnosis.fileHypotheses.length > 0) {
      const token = await requireToken(context.userId);
      await Promise.all(
        diagnosis.fileHypotheses.map(async (path) => {
          try {
            const content = await githubRaw(
              token,
              `repos/${data.owner}/${data.repo}/contents/${path}`,
              "application/vnd.github.raw",
            );
            fileContents.push({ path, content: content.slice(0, 16_000) });
          } catch {
            fileContents.push({ path, content: "" });
          }
        }),
      );
    }

    let patches: HealPatch[] = [];
    let explain = "";
    if (fileContents.length > 0) {
      try {
        const { content } = await aiComplete({
          json: true,
          messages: [
            { role: "system", content: PATCHER_SYSTEM },
            {
              role: "user",
              content: `DIAGNOSIS:\n${diagnosis.rootCause}\n\nFILES:\n${fileContents
                .map((file) => `===== ${file.path} =====\n${file.content}`)
                .join("\n\n")}`,
            },
          ],
          maxTokens: 4000,
        });
        const parsedPatch = parseAiJson<{
          explain?: string;
          patches?: Array<{ path?: string; before?: string; after?: string }>;
        }>(content);
        explain = String(parsedPatch.explain ?? "");
        const known = new Map(fileContents.map((file) => [file.path, file.content]));
        patches = (parsedPatch.patches ?? [])
          .slice(0, 6)
          .filter((patch) => patch?.path && typeof patch.after === "string")
          .map((patch) => {
            const path = String(patch.path).trim().replace(/^\/+/, "").slice(0, 300);
            const before =
              typeof patch.before === "string" && patch.before.trim()
                ? patch.before
                : (known.get(path) ?? "");
            const expected = known.get(path);
            return {
              path,
              before,
              after: String(patch.after),
              verified: expected == null ? true : before.trim() === expected.trim(),
            };
          });
      } catch (error) {
        explain = `Patcher unavailable: ${error instanceof Error ? error.message : "unknown error"}`;
      }
    }

    const { data: row, error: insertError } = await context.supabase
      .from("heal_runs")
      .insert({
        user_id: context.userId,
        owner: data.owner,
        repo: data.repo,
        ref: data.owner ? data.ref : null,
        error_text: data.errorText,
        status: "diagnosed",
        diagnosis: diagnosis as unknown as Record<string, never>,
        patch: patches as unknown as Record<string, never>,
      })
      .select()
      .single();
    if (insertError || !row) {
      console.error("Failed to persist heal run", insertError);
      throw new Error("Diagnosis complete but could not be saved.");
    }
    const healRun = {
      id: String(row.id),
      owner: (row.owner as string | null) ?? null,
      repo: (row.repo as string | null) ?? null,
      ref: (row.ref as string | null) ?? null,
      errorText: String(row.error_text ?? ""),
      status: "diagnosed",
      diagnosis,
      patch: patches,
      sandbox: null as SandboxReport | null,
      error: null as string | null,
      createdAt: String(row.created_at),
      updatedAt: String(row.created_at),
    };
    if (explain) {
      healRun.sandbox = {
        capability: { available: false, git: null, runtime: "undetermined" },
        applied: [],
        commands: [],
        exec: [],
        verdict: "blocked",
        rolledBack: false,
        rollbackResult: [],
        note: explain,
      };
    }
    return healRun;
  });

/* ---------- approval-gated sandbox verification ---------- */

export interface HealSandboxPayload {
  healId: string;
  owner: string;
  repo: string;
  ref: string;
  patch: Array<{ path: string; after: string }>;
  commands: string[];
}

export async function buildHealSandboxPayload(
  supabase: SupabaseClient<Database>,
  healId: string,
  command?: string,
): Promise<HealSandboxPayload> {
  const heal = await loadRun(supabase, healId);
  if (!heal) throw new Error("Heal run not found.");
  if (!heal.owner || !heal.repo || !heal.ref) {
    throw new Error("This heal run has no repository attached — attach one to use the sandbox.");
  }
  if (heal.patch.length === 0) throw new Error("No patch artifacts to verify.");
  const trimmed = (command ?? "").trim().slice(0, 300);
  return {
    healId: heal.id,
    owner: heal.owner,
    repo: heal.repo,
    ref: heal.ref,
    patch: heal.patch.map((patch) => ({ path: patch.path, after: patch.after })),
    commands: trimmed ? [trimmed] : [],
  };
}

async function approveSandboxHandler(
  supabase: SupabaseClient<Database>,
  userId: string,
  healId: string,
  command?: string,
) {
  const payload = await buildHealSandboxPayload(supabase, healId, command);
  return createApprovalRow(supabase, userId, {
    kind: "heal.sandbox-apply",
    title: `Sandbox-verify ${payload.patch.length} patched file(s) for ${payload.owner}/${payload.repo}`,
    risk: "high",
    payload,
  });
}

export const requestSandboxApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: { healId: string; command?: string }) =>
      ({
        healId: input.healId,
        command: (input.command ?? "").trim().slice(0, 300) || undefined,
      }) as {
        healId: string;
        command?: string;
      },
  )
  .handler(async ({ data, context }) =>
    approveSandboxHandler(context.supabase, context.userId, data.healId, data.command),
  );

export const runHealSandbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { healId: string; approvalId: string; command?: string }) => ({
    healId: input.healId,
    approvalId: input.approvalId,
    command: (input.command ?? "").trim().slice(0, 300) || undefined,
  }))
  .handler(async ({ data, context }): Promise<HealRun> => {
    const heal = await loadRun(context.supabase, data.healId);
    if (!heal) throw new Error("Heal run not found.");
    const token = await requireToken(context.userId);
    const payload = await buildHealSandboxPayload(context.supabase, data.healId, data.command);

    // A one-time, digest-verified human approval is mandatory for this sequence.
    await consumeApproved(context.supabase, data.approvalId, "heal.sandbox-apply", payload);

    const capability = await detectSandboxCapability();
    const report: SandboxReport = {
      capability,
      applied: [],
      commands: [],
      exec: [],
      verdict: "blocked",
      rolledBack: false,
      rollbackResult: [],
    };
    let status = "failed";
    let note: string | undefined;

    if (!capability.available) {
      report.note = capability.reason ?? "Sandbox unavailable on this runtime.";
      status = "failed";
    } else {
      let workspace: Awaited<ReturnType<typeof createSandboxWorkspace>> | null = null;
      try {
        workspace = await createSandboxWorkspace(token, payload.owner, payload.repo, payload.ref);

        const applied = await applyPatches(
          workspace,
          heal.patch.map((patch) => ({
            path: patch.path,
            before: patch.before,
            after: patch.after,
          })),
        );
        report.applied = applied;
        const guessed = await guessTestCommand(workspace);
        report.commands = payload.commands.length > 0 ? payload.commands : guessed ? [guessed] : [];

        if (report.commands.length === 0) {
          report.rolledBack = true;
          report.rollbackResult = await rollbackWorkspaceFiles(workspace);
          report.verdict = "rolled-back";
          note =
            "No runnable test command found in package.json — patch applied then rolled back as a precaution.";
          status = "rolled-back";
        } else {
          for (const command of report.commands.slice(0, 3)) {
            const exec = await runCommandInSandbox(workspace, command, 420);
            report.exec.push({
              command: exec.command,
              exitCode: exec.exitCode,
              timedOut: exec.timedOut,
              passed: exec.passed,
              stdout: exec.stdout,
              stderr: exec.stderr,
            });
            if (!exec.passed) {
              report.rolledBack = true;
              report.rollbackResult = await rollbackWorkspaceFiles(workspace);
              report.verdict = "rolled-back";
              note = "Verification failed — sandbox patch rolled back to the original files.";
              status = "rolled-back";
              break;
            }
          }
          if (!report.rolledBack) {
            report.verdict = "verified";
            status = "verified";
            note =
              "Patch verified inside the isolated sandbox. It was NOT applied to your repository.";
          }
        }
      } catch (error) {
        if (workspace) {
          report.rolledBack = true;
          report.rollbackResult = await rollbackWorkspaceFiles(workspace).catch(() => []);
        }
        note = error instanceof Error ? error.message : "Sandbox run failed.";
        status = "failed";
      } finally {
        if (workspace) await destroyWorkspace(workspace);
      }
    }

    report.note = note;
    await context.supabase
      .from("heal_runs")
      .update({
        status,
        sandbox: report as unknown as Record<string, never>,
        error: status === "failed" ? (note ?? "failed") : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", heal.id);

    return {
      ...heal,
      status,
      sandbox: report,
      error: status === "failed" ? (note ?? "failed") : null,
      updatedAt: new Date().toISOString(),
    };
  });

/* ---------- approval-gated delivery of the verified patch ---------- */

export interface HealBranchPayload {
  healId: string;
  owner: string;
  repo: string;
  ref: string;
  branch: string;
  message: string;
  files: Array<{ path: string; content: string }>;
}

export async function buildHealBranchPayload(
  supabase: SupabaseClient<Database>,
  healId: string,
): Promise<HealBranchPayload> {
  const heal = await loadRun(supabase, healId);
  if (!heal) throw new Error("Heal run not found.");
  if (!heal.owner || !heal.repo || !heal.ref)
    throw new Error("Heal run has no repository attached.");
  if (heal.patch.length === 0) throw new Error("No patch artifacts on this heal run.");
  return {
    healId: heal.id,
    owner: heal.owner,
    repo: heal.repo,
    ref: heal.ref,
    branch: `codepilot/heal-${heal.id.slice(0, 8)}`,
    message: `CodePilot AI heal patch (run ${heal.id.slice(0, 8)})`,
    files: heal.patch.map((patch) => ({ path: patch.path, content: patch.after })),
  };
}

export const requestHealBranchApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { healId: string }) => input)
  .handler(async ({ data, context }) => {
    const payload = await buildHealBranchPayload(context.supabase, data.healId);
    return createApprovalRow(context.supabase, context.userId, {
      kind: "heal.create-branch",
      title: `Create branch ${payload.branch} with the heal patch`,
      risk: "high",
      payload,
    });
  });

export const commitHealBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { healId: string; approvalId: string }) => input)
  .handler(async ({ data, context }) => {
    const token = await requireToken(context.userId);
    const payload = await buildHealBranchPayload(context.supabase, data.healId);
    await consumeApproved(context.supabase, data.approvalId, "heal.create-branch", payload);
    const headSha = await getHeadSha(token, payload.owner, payload.repo, payload.ref);
    if (!headSha) throw new Error("Could not read the base branch head.");
    const created = await createBranchFrom(
      token,
      payload.owner,
      payload.repo,
      headSha,
      payload.branch,
    );
    const committed = await commitFilesToBranch(
      token,
      payload.owner,
      payload.repo,
      payload.branch,
      created,
      payload.files,
      payload.message,
    );
    return {
      branch: committed.branch,
      commitSha: committed.commitSha,
      url: `https://github.com/${payload.owner}/${payload.repo}/compare/${committed.branch}?expand=1`,
    };
  });

export const getHealRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<HealRun> => {
    const heal = await loadRun(context.supabase, data.id);
    if (!heal) throw new Error("Heal run not found.");
    return heal;
  });

export const listHealRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HealRun[]> => {
    const { data, error } = await context.supabase
      .from("heal_runs")
      .select()
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) {
      console.error("Failed to list heal runs", error);
      return [];
    }
    return (data ?? []).map((row) => {
      const mapped = row as unknown as Record<string, unknown>;
      return {
        id: String(mapped.id),
        owner: (mapped.owner as string | null) ?? null,
        repo: (mapped.repo as string | null) ?? null,
        ref: (mapped.ref as string | null) ?? null,
        errorText: String(mapped.error_text ?? ""),
        status: String(mapped.status ?? "diagnosed"),
        diagnosis: (mapped.diagnosis as Diagnosis | null) ?? null,
        patch: (mapped.patch as HealPatch[] | null) ?? [],
        sandbox: (mapped.sandbox as SandboxReport | null) ?? null,
        error: (mapped.error as string | null) ?? null,
        createdAt: String(mapped.created_at),
        updatedAt: String(mapped.updated_at ?? mapped.created_at),
      };
    });
  });
