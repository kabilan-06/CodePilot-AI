// Digital Twin server functions. Builds a cached, real-data architecture graph
// for a GitHub repo/ref using the user's stored token.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRepo, requireToken, safeRef } from "../github.server";
import { getOrBuildTwin } from "./twin.server";
import type { TwinSnapshot } from "./twin-types";

function mapSnapshot(row: Record<string, unknown>): TwinSnapshot {
  return {
    id: String(row.id),
    owner: String(row.owner),
    repo: String(row.repo),
    ref: String(row.ref),
    treeSha: String(row.tree_sha),
    fileCount: Number(row.file_count ?? 0),
    stats: (row.stats ?? {}) as TwinSnapshot["stats"],
    graph: (row.graph ?? {}) as TwinSnapshot["graph"],
    createdAt: String(row.created_at),
  };
}

export const buildTwinSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { owner: string; repo: string; ref: string }) => {
    assertRepo(input.owner, input.repo);
    return { owner: input.owner, repo: input.repo, ref: safeRef(input.ref || "main") };
  })
  .handler(async ({ data, context }) => {
    const token = await requireToken(context.userId);
    const { snapshot, reused } = await getOrBuildTwin(
      context.supabase,
      context.userId,
      token,
      data.owner,
      data.repo,
      data.ref,
    );
    if (!snapshot) throw new Error("Could not build the twin graph.");
    return { snapshot, reused };
  });

export const getTwinSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { owner: string; repo: string; ref: string }) => {
    assertRepo(input.owner, input.repo);
    return { owner: input.owner, repo: input.repo, ref: safeRef(input.ref || "main") };
  })
  .handler(async ({ data, context }): Promise<TwinSnapshot | null> => {
    const { data: row } = await context.supabase
      .from("twin_snapshots")
      .select()
      .eq("owner", data.owner)
      .eq("repo", data.repo)
      .eq("ref", data.ref)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return row ? mapSnapshot(row) : null;
  });

/** Latest snapshots across the user's repos — powers Mission Control. */
export const listRecentTwins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TwinSnapshot[]> => {
    const { data, error } = await context.supabase
      .from("twin_snapshots")
      .select()
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) {
      console.error("Failed to list twins", error);
      return [];
    }
    const seen = new Set<string>();
    const out: TwinSnapshot[] = [];
    for (const row of data ?? []) {
      const key = `${row.owner}/${row.repo}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(mapSnapshot(row));
    }
    return out;
  });
