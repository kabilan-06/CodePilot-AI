import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReviewIssue, ReviewRecord, Scores } from "./review-types";

function mapRow(row: Record<string, unknown>): ReviewRecord {
  return {
    id: String(row.id),
    title: String(row.title ?? "Untitled review"),
    language: String(row.language ?? "typescript"),
    source: String(row.source ?? "paste"),
    source_ref: (row.source_ref as string | null) ?? null,
    code: String(row.code ?? ""),
    grade: String(row.grade ?? "B"),
    overall_score: Number(row.overall_score ?? 0),
    summary: String(row.summary ?? ""),
    scores: (row.scores ?? {}) as Scores,
    issues: (Array.isArray(row.issues) ? row.issues : []) as ReviewIssue[],
    created_at: String(row.created_at),
  };
}

export const reviewsQuery = queryOptions({
  queryKey: ["reviews"],
  queryFn: async (): Promise<ReviewRecord[]> => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },
});

export function reviewQuery(id: string) {
  return queryOptions({
    queryKey: ["reviews", id],
    queryFn: async (): Promise<ReviewRecord> => {
      const { data, error } = await supabase.from("reviews").select("*").eq("id", id).single();
      if (error) throw error;
      return mapRow(data);
    },
  });
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
}

export function toMarkdown(review: ReviewRecord): string {
  const lines: string[] = [
    `# ${review.title}`,
    "",
    `**Grade:** ${review.grade} (${review.overall_score}/100) · **Language:** ${review.language} · **Source:** ${review.source}`,
    "",
    "## Summary",
    review.summary,
    "",
    "## Scores",
    ...Object.entries(review.scores).map(([key, value]) => `- ${key}: ${value}/100`),
    "",
    "## Issues",
  ];
  review.issues.forEach((issue, index) => {
    lines.push(
      "",
      `### ${index + 1}. ${issue.title} (${issue.severity} · ${issue.category}${
        issue.line ? ` · line ${issue.line}` : ""
      })`,
      "",
      issue.explanation,
      "",
      `**Why it matters:** ${issue.why_it_matters}`,
      "",
      `**How to fix:** ${issue.how_to_fix}`,
      "",
      "```",
      issue.improved_code,
      "```",
      "",
      `**Alternative:** ${issue.alternative}`,
      "",
      `**Estimated improvement:** ${issue.estimated_improvement}`,
    );
  });
  return lines.join("\n");
}

export function downloadFile(name: string, content: string, type = "text/markdown") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
