import { t as supabase } from "./client-BJR5m-0k.mjs";
import { n as queryOptions } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reviews-C9RR1t_a.js
function mapRow(row) {
	return {
		id: String(row.id),
		title: String(row.title ?? "Untitled review"),
		language: String(row.language ?? "typescript"),
		source: String(row.source ?? "paste"),
		source_ref: row.source_ref ?? null,
		code: String(row.code ?? ""),
		grade: String(row.grade ?? "B"),
		overall_score: Number(row.overall_score ?? 0),
		summary: String(row.summary ?? ""),
		scores: row.scores ?? {},
		issues: Array.isArray(row.issues) ? row.issues : [],
		created_at: String(row.created_at)
	};
}
var reviewsQuery = queryOptions({
	queryKey: ["reviews"],
	queryFn: async () => {
		const { data, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(200);
		if (error) throw error;
		return (data ?? []).map(mapRow);
	}
});
function reviewQuery(id) {
	return queryOptions({
		queryKey: ["reviews", id],
		queryFn: async () => {
			const { data, error } = await supabase.from("reviews").select("*").eq("id", id).single();
			if (error) throw error;
			return mapRow(data);
		}
	});
}
async function deleteReview(id) {
	const { error } = await supabase.from("reviews").delete().eq("id", id);
	if (error) throw error;
}
function toMarkdown(review) {
	const lines = [
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
		"## Issues"
	];
	review.issues.forEach((issue, index) => {
		lines.push("", `### ${index + 1}. ${issue.title} (${issue.severity} · ${issue.category}${issue.line ? ` · line ${issue.line}` : ""})`, "", issue.explanation, "", `**Why it matters:** ${issue.why_it_matters}`, "", `**How to fix:** ${issue.how_to_fix}`, "", "```", issue.improved_code, "```", "", `**Alternative:** ${issue.alternative}`, "", `**Estimated improvement:** ${issue.estimated_improvement}`);
	});
	return lines.join("\n");
}
function downloadFile(name, content, type = "text/markdown") {
	const blob = new Blob([content], { type });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = name;
	anchor.click();
	URL.revokeObjectURL(url);
}
//#endregion
export { toMarkdown as a, reviewsQuery as i, downloadFile as n, reviewQuery as r, deleteReview as t };
