// Human-in-the-loop approval workflow. Client code creates a pending approval
// (with an exact snapshot of what will run), a human approves or rejects it in
// the UI, and only then may a destructive server function consume it via
// consumeApproved().

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createApprovalRow } from "./approvals.server";

export type ApprovalRisk = "low" | "medium" | "high";

export interface ApprovalRecord {
  id: string;
  kind: string;
  title: string;
  /** Serialized payload (parsed on the client for display). */
  payloadJson: string;
  risk: ApprovalRisk | string;
  status: string;
  askedAt: string;
  decidedAt: string | null;
  expiresAt: string;
  consumedAt: string | null;
}

function mapRow(row: Record<string, unknown>): ApprovalRecord {
  return {
    id: String(row.id),
    kind: String(row.kind),
    title: String(row.title ?? ""),
    payloadJson: JSON.stringify(row.payload ?? {}),
    risk: String(row.risk ?? "medium"),
    status: String(row.status ?? "pending"),
    askedAt: String(row.asked_at),
    decidedAt: (row.decided_at as string | null) ?? null,
    expiresAt: String(row.expires_at),
    consumedAt: (row.consumed_at as string | null) ?? null,
  };
}

export const requestApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { kind: string; title: string; payload: unknown; risk?: string }) => {
    const payload = JSON.parse(JSON.stringify(input.payload ?? {})) as Record<string, unknown>;
    const encoded = JSON.stringify(payload);
    if (encoded.length > 200_000) {
      throw new Error("Approval payload is too large to review safely.");
    }
    return {
      kind: (input.kind || "").slice(0, 60),
      title: (input.title || "Approve operation").slice(0, 160),
      payload,
      risk: (["low", "medium", "high"].includes(input.risk ?? "")
        ? input.risk
        : "medium") as string,
    };
  })
  .handler(async ({ data, context }) => {
    const created = await createApprovalRow(context.supabase, context.userId, {
      kind: data.kind,
      title: data.title,
      risk: data.risk,
      payload: data.payload,
    });
    return {
      id: created.id,
      kind: created.kind,
      title: created.title,
      payloadJson: JSON.stringify(created.payload),
      risk: created.risk,
      status: created.status,
      askedAt: created.askedAt,
      decidedAt: created.decidedAt,
      expiresAt: created.expiresAt,
      consumedAt: created.consumedAt,
    };
  });

export const listApprovals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApprovalRecord[]> => {
    const { data, error } = await context.supabase
      .from("approvals")
      .select()
      .order("asked_at", { ascending: false })
      .limit(30);
    if (error) {
      console.error("Failed to list approvals", error);
      throw new Error("Could not load approvals.");
    }
    return (data ?? []).map(mapRow);
  });

export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string; decision: "approved" | "rejected"; note?: string }) => {
    if (!/^[0-9a-fA-F-]{10,64}$/.test(String(input.id))) throw new Error("Invalid approval id.");
    return {
      id: input.id,
      decision: input.decision,
      note: (input.note || "").slice(0, 300) || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("approvals")
      .select("status, expires_at")
      .eq("id", data.id)
      .maybeSingle();

    if (!row) throw new Error("Approval request not found.");
    if (row.status !== "pending") throw new Error(`Already ${row.status}.`);
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await context.supabase.from("approvals").update({ status: "expired" }).eq("id", data.id);
      throw new Error("Approval window expired. Request it again.");
    }

    const now = new Date().toISOString();
    const { data: updated, error } = await context.supabase
      .from("approvals")
      .update({ status: data.decision, decided_at: now, decision_note: data.note })
      .eq("id", data.id)
      .select()
      .single();
    if (error || !updated) {
      console.error("Failed to record approval decision", error);
      throw new Error("Could not record the decision.");
    }
    return mapRow(updated);
  });
