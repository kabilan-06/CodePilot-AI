// Shared twin resolver used by twin, radar and swarm flows: either reuse the
// cached snapshot for this exact tree SHA or build (and persist) one.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildTwinFromScan, scanRepoTree } from "./indexer.server";
import type { TwinSnapshot } from "./twin-types";

export async function getOrBuildTwin(
  supabase: SupabaseClient<Database>,
  userId: string,
  token: string,
  owner: string,
  repo: string,
  ref: string,
): Promise<{ snapshot: TwinSnapshot | null; reused: boolean }> {
  const scan = await scanRepoTree(token, owner, repo, ref);

  const { data: cached } = await supabase
    .from("twin_snapshots")
    .select()
    .eq("owner", owner)
    .eq("repo", repo)
    .eq("ref", ref)
    .eq("tree_sha", scan.sha)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    return {
      snapshot: {
        id: String(cached.id),
        owner,
        repo,
        ref,
        treeSha: String(cached.tree_sha),
        fileCount: Number(cached.file_count ?? 0),
        stats: (cached.stats ?? {}) as unknown as TwinSnapshot["stats"],
        graph: (cached.graph ?? {}) as unknown as TwinSnapshot["graph"],
        createdAt: String(cached.created_at),
      },
      reused: true,
    };
  }

  const built = await buildTwinFromScan(token, owner, repo, scan);
  const { data: row, error } = await supabase
    .from("twin_snapshots")
    .insert({
      user_id: userId,
      owner,
      repo,
      ref,
      tree_sha: scan.sha,
      file_count: built.fileCount,
      stats: built.stats as unknown as Record<string, never>,
      graph: built.graph as unknown as Record<string, never>,
    })
    .select()
    .single();

  if (error || !row) {
    // The graph is still valid for this request even if persistence failed.
    console.error("Failed to persist twin snapshot", error);
    return {
      snapshot: {
        id: `ephemeral-${Date.now()}`,
        owner,
        repo,
        ref,
        treeSha: scan.sha,
        fileCount: built.fileCount,
        stats: built.stats,
        graph: built.graph,
        createdAt: new Date().toISOString(),
      },
      reused: false,
    };
  }

  return {
    snapshot: {
      id: String(row.id),
      owner,
      repo,
      ref,
      treeSha: String(row.tree_sha),
      fileCount: Number(row.file_count ?? 0),
      stats: (row.stats ?? {}) as unknown as TwinSnapshot["stats"],
      graph: (row.graph ?? {}) as unknown as TwinSnapshot["graph"],
      createdAt: String(row.created_at),
    },
    reused: false,
  };
}
