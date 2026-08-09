import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  GitHubBranch,
  GitHubCommit,
  GitHubConnection,
  GitHubFile,
  GitHubPull,
  GitHubRepo,
  GitHubTreeEntry,
} from "./github-types";

export const getGitHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GitHubConnection | null> => {
    const { loadConnection } = await import("./github.server");
    const row = await loadConnection(context.userId);
    if (!row) return null;
    return {
      login: row.github_login,
      avatarUrl: row.avatar_url,
      scope: row.scope,
      connectedAt: row.created_at,
    };
  });

export const startGitHubOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { authorizeUrl, signState } = await import("./github.server");
    const origin = new URL(getRequest().url).origin;
    return { url: authorizeUrl(origin, signState(context.userId)) };
  });

export const disconnectGitHub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { deleteConnection } = await import("./github.server");
    await deleteConnection(context.userId);
    return { ok: true };
  });

export const listGitHubRepos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GitHubRepo[]> => {
    const { githubFetch, requireToken } = await import("./github.server");
    const token = await requireToken(context.userId);
    const repos = await githubFetch<GitHubRepo[]>(
      token,
      "user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
    );
    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      html_url: repo.html_url,
      default_branch: repo.default_branch,
      private: repo.private,
      updated_at: repo.updated_at,
    }));
  });

export const listGitHubBranches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { owner: string; repo: string }) => input)
  .handler(async ({ data, context }): Promise<GitHubBranch[]> => {
    const { assertRepo, githubFetch, requireToken } = await import("./github.server");
    assertRepo(data.owner, data.repo);
    const token = await requireToken(context.userId);
    return githubFetch<GitHubBranch[]>(
      token,
      `repos/${data.owner}/${data.repo}/branches?per_page=100`,
    );
  });

export const listGitHubCommits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { owner: string; repo: string; ref: string }) => input)
  .handler(async ({ data, context }): Promise<GitHubCommit[]> => {
    const { assertRepo, githubFetch, requireToken, safeRef } = await import("./github.server");
    assertRepo(data.owner, data.repo);
    const ref = safeRef(data.ref);
    const token = await requireToken(context.userId);
    return githubFetch<GitHubCommit[]>(
      token,
      `repos/${data.owner}/${data.repo}/commits?per_page=30&sha=${encodeURIComponent(ref)}`,
    );
  });

export const listGitHubPulls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { owner: string; repo: string; state: "open" | "closed" | "all" }) => input)
  .handler(async ({ data, context }): Promise<GitHubPull[]> => {
    const { assertRepo, githubFetch, requireToken } = await import("./github.server");
    assertRepo(data.owner, data.repo);
    const state = ["open", "closed", "all"].includes(data.state) ? data.state : "open";
    const token = await requireToken(context.userId);
    return githubFetch<GitHubPull[]>(
      token,
      `repos/${data.owner}/${data.repo}/pulls?per_page=30&state=${state}&sort=updated&direction=desc`,
    );
  });

export const listGitHubTree = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { owner: string; repo: string; ref: string; path: string }) => input)
  .handler(async ({ data, context }): Promise<GitHubTreeEntry[]> => {
    const { assertRepo, githubFetch, requireToken, safePath, safeRef } =
      await import("./github.server");
    assertRepo(data.owner, data.repo);
    const ref = safeRef(data.ref);
    const path = safePath(data.path ?? "");
    const token = await requireToken(context.userId);
    const entries = await githubFetch<GitHubTreeEntry[] | GitHubTreeEntry>(
      token,
      `repos/${data.owner}/${data.repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
    );
    const list = Array.isArray(entries) ? entries : [entries];
    return list
      .map((entry) => ({ name: entry.name, path: entry.path, type: entry.type, size: entry.size }))
      .sort((a, b) =>
        a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1,
      );
  });

export const getGitHubFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { owner: string; repo: string; ref: string; path: string }) => input)
  .handler(async ({ data, context }): Promise<GitHubFile> => {
    const { assertRepo, githubRaw, requireToken, safePath, safeRef } =
      await import("./github.server");
    assertRepo(data.owner, data.repo);
    const ref = safeRef(data.ref);
    const path = safePath(data.path);
    const token = await requireToken(context.userId);
    const content = await githubRaw(
      token,
      `repos/${data.owner}/${data.repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
      "application/vnd.github.raw",
    );
    if (content.length > 40000) throw new Error("That file is too large (max 40,000 characters).");
    return { path, content };
  });

export const getGitHubPullDiff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { owner: string; repo: string; number: number }) => input)
  .handler(async ({ data, context }): Promise<GitHubFile> => {
    const { assertRepo, githubRaw, requireToken } = await import("./github.server");
    assertRepo(data.owner, data.repo);
    if (!Number.isInteger(data.number) || data.number < 1) throw new Error("Invalid pull request.");
    const token = await requireToken(context.userId);
    const diff = await githubRaw(
      token,
      `repos/${data.owner}/${data.repo}/pulls/${data.number}`,
      "application/vnd.github.diff",
    );
    if (diff.length > 40000) throw new Error("That pull request diff is too large to review.");
    return { path: `PR #${data.number}`, content: diff };
  });
