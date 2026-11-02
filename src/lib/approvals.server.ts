// Approval ledger helpers (server side). Every destructive operation in
// CodePilot AI must go through a one-time, digest-verified approval row so a
// stale, replayed, or tampered request can never execute.

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

export const APPROVAL_TTL_MINUTES = 30;

export const APPROVAL_KINDS = [
  "swarm.apply-patch",
  "swarm.create-branch",
  "heal.sandbox-apply",
  "heal.create-branch",
  "heal.rollback",
] as const;

export type ApprovalKind = (typeof APPROVAL_KINDS)[number];

export interface GrantedApproval {
  id: string;
  kind: string;
  payload: Record<string, Json>;
}

export function approvalDigest(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(payload ?? {}))
    .digest("hex")
    .slice(0, 32);
}

function isExpired(row: { expires_at: string | null }): boolean {
  if (!row.expires_at) return false;
  return new Date(row.expires_at).getTime() <= Date.now();
}

/**
 * Verifies the approval exists for this user, targets the given kind and
 * payload digest, was approved, has not expired and has not been consumed —
 * then consumes it atomically and returns the stored payload.
 */
export async function consumeApproved(
  supabase: SupabaseClient<Database>,
  approvalId: string,
  kind: string,
  payload: unknown,
): Promise<GrantedApproval> {
  const { data } = await supabase
    .from("approvals")
    .select("id, kind, digest, status, expires_at, payload")
    .eq("id", approvalId)
    .maybeSingle();

  if (!data) {
    throw new Error("Approval request not found. Ask for approval again.");
  }
  if (data.status !== "approved") {
    throw new Error(
      data.status === "rejected"
        ? "That request was rejected by a human reviewer."
        : "Approval has not been granted yet.",
    );
  }
  if (isExpired(data)) {
    throw new Error("Approval expired. Ask for approval again.");
  }
  if (data.kind !== kind) {
    throw new Error("Approval request does not match this operation.");
  }
  if (data.digest !== approvalDigest(payload)) {
    throw new Error("Operation changed since approval was granted. Denying.");
  }

  const now = new Date().toISOString();
  const { data: consumed, error } = await supabase
    .from("approvals")
    .update({ consumed_at: now })
    .eq("id", approvalId)
    .eq("kind", kind)
    .eq("digest", data.digest)
    .eq("status", "approved")
    .is("consumed_at", null)
    .gt("expires_at", now)
    .select("id, kind, payload")
    .single();

  if (error || !consumed) {
    throw new Error("Approval already used. Ask for approval again.");
  }
  return {
    id: String(consumed.id),
    kind: String(consumed.kind),
    payload: (consumed.payload ?? {}) as Record<string, Json>,
  };
}

export interface PendingApprovalRow {
  id: string;
  kind: string;
  title: string;
  payload: Record<string, Json>;
  risk: string;
  status: string;
  askedAt: string;
  decidedAt: string | null;
  expiresAt: string;
  consumedAt: string | null;
}

/** Creates a pending approval from inside any server function. */
export async function createApprovalRow(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: { kind: string; title: string; risk?: string; payload: unknown },
): Promise<PendingApprovalRow> {
  const payload = JSON.parse(JSON.stringify(input.payload ?? {})) as Record<string, Json>;
  const encoded = JSON.stringify(payload);
  if (encoded.length > 200_000) {
    throw new Error("Approval payload is too large to review safely.");
  }
  const expires = new Date(Date.now() + APPROVAL_TTL_MINUTES * 60 * 1000).toISOString();
  const { data: row, error } = await supabase
    .from("approvals")
    .insert({
      user_id: userId,
      kind: input.kind.slice(0, 60),
      title: (input.title || "Approve operation").slice(0, 160),
      payload: payload as unknown as Record<string, never>,
      digest: approvalDigest(payload),
      risk: (["low", "medium", "high"].includes(input.risk ?? "")
        ? input.risk
        : "medium") as string,
      expires_at: expires,
    })
    .select()
    .single();
  if (error || !row) {
    console.error("Failed to create approval", error);
    throw new Error("Could not create the approval request.");
  }
  return {
    id: String(row.id),
    kind: String(row.kind),
    title: String(row.title ?? ""),
    payload,
    risk: String(row.risk ?? "medium"),
    status: String(row.status ?? "pending"),
    askedAt: String(row.asked_at),
    decidedAt: (row.decided_at as string | null) ?? null,
    expiresAt: String(row.expires_at),
    consumedAt: (row.consumed_at as string | null) ?? null,
  };
}
