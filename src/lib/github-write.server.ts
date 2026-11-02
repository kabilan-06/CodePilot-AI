// GitHub write operations used after explicit human approval. Everything goes
// to a brand-new branch — existing refs are never moved or force-pushed.

import { githubFetch } from "./github.server";

async function githubApiWrite<T>(
  token: string,
  path: string,
  method: "POST" | "PATCH",
  body: unknown,
): Promise<T> {
  const response = await fetch(`https://api.github.com/${path.replace(/^\//, "")}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "CodePilot-AI",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`GitHub write error [${response.status}] ${method} ${path}: ${text}`);
    if (response.status === 422) {
      throw new Error(`GitHub rejected the request: ${text.slice(0, 300)}`);
    }
    throw new Error(`GitHub ${method} request failed (${response.status}).`);
  }
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

interface RefObject {
  object?: { sha: string; type?: string };
  ref?: string;
}

export async function getHeadSha(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<string | null> {
  try {
    const ref = await githubFetch<RefObject>(
      token,
      `repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    );
    return ref.object?.sha ?? null;
  } catch {
    return null;
  }
}

export async function createBranchFrom(
  token: string,
  owner: string,
  repo: string,
  baseSha: string,
  newBranch: string,
): Promise<string> {
  const created = await githubApiWrite<RefObject>(
    token,
    `repos/${owner}/${repo}/git/refs`,
    "POST",
    { ref: `refs/heads/${newBranch}`, sha: baseSha },
  );
  return created!.object!.sha;
}

export interface CommitFileInput {
  path: string;
  content: string;
}

export async function commitFilesToBranch(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  baseSha: string,
  files: CommitFileInput[],
  message: string,
): Promise<{ commitSha: string; branch: string }> {
  const baseCommit = await githubFetch<{ tree: { sha: string } }>(
    token,
    `repos/${owner}/${repo}/git/commits/${encodeURIComponent(baseSha)}`,
  );
  const baseTreeSha = baseCommit.tree.sha;

  const blobs = await Promise.all(
    files.map(async (file) => {
      const blob = await githubApiWrite<{ sha: string }>(
        token,
        `repos/${owner}/${repo}/git/blobs`,
        "POST",
        { content: file.content, encoding: "utf-8" },
      );
      return { path: file.path, sha: blob.sha };
    }),
  );

  const tree = await githubApiWrite<{ sha: string }>(
    token,
    `repos/${owner}/${repo}/git/trees`,
    "POST",
    {
      base_tree: baseTreeSha,
      tree: blobs.map((blob) => ({ path: blob.path, mode: "100644", type: "blob", sha: blob.sha })),
    },
  );

  const commit = await githubApiWrite<{ sha: string }>(
    token,
    `repos/${owner}/${repo}/git/commits`,
    "POST",
    { message, tree: tree.sha, parents: [baseSha] },
  );

  await githubApiWrite(
    token,
    `repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
    "PATCH",
    { sha: commit.sha, force: false },
  );

  return { commitSha: commit.sha, branch };
}
