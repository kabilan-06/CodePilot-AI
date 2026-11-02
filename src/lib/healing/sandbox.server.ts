// Sandboxed execution engine for the Self-Healing environment (Node runtimes).
// Strategy: isolated temp directory, `git clone --depth 1` of the target ref,
// file snapshots before patching, auto-rollback on failed verification, and
// always-destroy cleanup so tokens and test artifacts never linger.
//
// Not available on edge runtimes (Cloudflare/Vercel edge) — capability-aware.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface SandboxCapability {
  available: boolean;
  git: string | null;
  reason?: string;
  runtime: string;
}

export interface SandboxWorkspace {
  id: string;
  dir: string;
  root: string;
  owner: string;
  repo: string;
  ref: string;
}

export interface AppliedPatch {
  path: string;
  fullPath: string;
  existedBefore: boolean;
  ok: boolean;
  error?: string;
}

export interface ExecOutcome {
  command: string;
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  passed: boolean;
  signal?: string;
}

export interface RollbackResult {
  path: string;
  restored: boolean;
  created: boolean;
  error?: string;
}

const isWindows = process.platform === "win32";

function runProcess(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs: number },
): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (isWindows && child.pid) {
          spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
        } else {
          child.kill("SIGKILL");
        }
      } catch {
        child.kill();
      }
    }, options.timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
      if (stdout.length > 120_000) stdout = stdout.slice(-120_000);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
      if (stderr.length > 120_000) stderr = stderr.slice(-120_000);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({
        code: null,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim(),
        timedOut,
      });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      void signal;
      resolvePromise({ code, stdout, stderr, timedOut });
    });
  });
}

export async function detectSandboxCapability(): Promise<SandboxCapability> {
  const runtime = !process.versions.node
    ? "edge"
    : process.env.NITRO_PRESET === "vercel"
      ? "vercel"
      : "node";
  if (runtime === "edge") {
    return {
      available: false,
      git: null,
      reason: "Edge runtime has no process execution; run on a Node deployment or locally.",
      runtime,
    };
  }
  const probe = await runProcess("git", ["--version"], { timeoutMs: 15_000 });
  const git = probe.code === 0 ? (probe.stdout.trim().split("\n")[0] ?? "git") : null;
  if (!git) {
    return { available: false, git: null, reason: "git is not installed on this server.", runtime };
  }
  return { available: true, git, runtime };
}

export async function createSandboxWorkspace(
  token: string,
  owner: string,
  repo: string,
  ref: string,
): Promise<SandboxWorkspace> {
  const parent = await mkdtemp(path.join(os.tmpdir(), "codepilot-sandbox-"));
  const cloneUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
  const checkout = path.join(parent, "checkout");
  const result = await runProcess(
    "git",
    ["clone", "--depth", "1", "--single-branch", "--branch", ref, cloneUrl, checkout],
    { cwd: parent, env: { GIT_TERMINAL_PROMPT: "0" }, timeoutMs: 240_000 },
  );
  if (result.code !== 0) {
    await rm(parent, { recursive: true, force: true }).catch(() => undefined);
    throw new Error(
      `Could not clone ${owner}/${repo}@${ref} into the sandbox: ${(result.stderr || result.stdout)
        .replace(cloneUrl, "***")
        .split("\n")
        .slice(-3)
        .join(" ")
        .slice(0, 300)}`,
    );
  }
  return { id: path.basename(parent), dir: parent, root: checkout, owner, repo, ref };
}

/** Writes the workspace layout: repo clone content is located at root; verify & normalize. */
export async function ensureRepoRoot(workspace: SandboxWorkspace): Promise<string> {
  if (existsSync(path.join(workspace.root, ".git"))) return workspace.root;
  if (existsSync(path.join(workspace.dir, ".git"))) return workspace.dir;
  throw new Error("Sandbox workspace is missing the cloned repository.");
}

function safeJoin(root: string, relative: string): string {
  const resolved = path.resolve(root, relative.replace(/\\/g, "/").replace(/^\/+/, ""));
  const normalizedRoot = path.resolve(root);
  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    throw new Error(`Patch path escapes the sandbox: ${relative}`);
  }
  return resolved;
}

/** Snapshot + apply patches inside the sandboxed clone. Trusts only patch objects. */
export async function applyPatches(
  workspace: SandboxWorkspace,
  patches: Array<{ path: string; before: string; after: string }>,
): Promise<Array<{ path: string; existedBefore: boolean; ok: boolean; error?: string }>> {
  const root = await ensureRepoRoot(workspace);
  const pending: Array<{ relative: string; target: string; previous: string | null }> = [];
  const applied: Array<{ path: string; existedBefore: boolean; ok: boolean; error?: string }> = [];

  for (const patch of patches) {
    const target = safeJoin(root, patch.path);
    pending.push({
      relative: patch.path,
      target,
      previous: existsSync(target) ? await readFile(target, "utf-8") : null,
    });
    try {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, patch.after, "utf-8");
      applied.push({
        path: patch.path,
        existedBefore: pending[pending.length - 1].previous !== null,
        ok: true,
      });
    } catch (error) {
      applied.push({
        path: patch.path,
        existedBefore: pending[pending.length - 1].previous !== null,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Snapshot manifest retained for rollback.
  await writeFile(path.join(workspace.dir, "heal-snapshot.json"), JSON.stringify(pending), "utf-8");
  return applied;
}

export async function rollbackWorkspaceFiles(
  workspace: SandboxWorkspace,
): Promise<RollbackResult[]> {
  const manifestPath = path.join(workspace.dir, "heal-snapshot.json");
  if (!existsSync(manifestPath)) return [];
  const manifest = JSON.parse(await readFile(manifestPath, "utf-8")) as Array<{
    path: string;
    target: string;
    previous: string | null;
  }>;
  const results: RollbackResult[] = [];
  for (const entry of manifest) {
    try {
      if (entry.previous === null) {
        if (existsSync(entry.target)) await rm(entry.target, { force: true });
        results.push({ path: entry.path, restored: true, created: true });
      } else {
        await writeFile(entry.target, entry.previous, "utf-8");
        results.push({ path: entry.path, restored: true, created: false });
      }
    } catch (error) {
      results.push({
        path: entry.path,
        restored: false,
        created: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}

const DESTRUCTIVE =
  /(\brm\s+-rf\b)|(\brmdir\s+\/s\b)|(\bdel\s+\/[sq]\b)|(\bformat\s+[a-z]:)|(\bmkfs\b)|(\bshutdown\b)|(\bkill\s+-9\s+1\b)|(\bsudo\b)/i;

export function assertSafeCommand(command: string): void {
  if (!command || command.length > 300) throw new Error("Invalid sandbox command.");
  if (DESTRUCTIVE.test(command)) {
    throw new Error("Refusing destructive command in the healing sandbox.");
  }
}

export async function runCommandInSandbox(
  workspace: SandboxWorkspace,
  command: string,
  timeoutSec = 300,
): Promise<ExecOutcome> {
  assertSafeCommand(command);
  const root = await ensureRepoRoot(workspace);
  const result = await runProcess(
    isWindows ? "cmd.exe" : "bash",
    isWindows ? ["/d", "/s", "/c", command] : ["-lc", command],
    {
      cwd: root,
      timeoutMs: Math.max(30, timeoutSec) * 1000,
      env: { GIT_TERMINAL_PROMPT: "0", CI: "1" },
    },
  );
  const output = `${result.stdout}\n${result.stderr}`;
  const failedPatterns =
    /(✖|✗|×|failing|failures?\s*[:=]|\d+ failed|error TS|AssertionError|BUILD FAILED|exit code 1)/i;
  const passed =
    result.code === 0 && !failedPatterns.test(result.stdout) && !/^\s*fail/i.test(result.stderr);
  return {
    command,
    exitCode: result.code,
    timedOut: result.timedOut,
    stdout: result.stdout.slice(-8_000),
    stderr: result.stderr.slice(-8_000),
    passed,
    signal: result.code === null ? "signal" : undefined,
  };
}

/** Guesses the test command from the cloned repository. */
export async function guessTestCommand(workspace: SandboxWorkspace): Promise<string | null> {
  const root = await ensureRepoRoot(workspace);
  const packageJsonPath = path.join(root, "package.json");
  if (!existsSync(packageJsonPath)) return null;
  try {
    const parsed = JSON.parse(await readFile(packageJsonPath, "utf-8")) as {
      scripts?: Record<string, string | undefined>;
    };
    const scripts = parsed.scripts ?? {};
    return scripts.test || scripts["test:unit"] || scripts["test:ci"] || null;
  } catch {
    return null;
  }
}

export async function destroyWorkspace(workspace: SandboxWorkspace): Promise<void> {
  await rm(workspace.dir, { recursive: true, force: true }).catch(() => undefined);
}
