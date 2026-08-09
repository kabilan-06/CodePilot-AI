import { i as gradeFromScore, n as SCORE_KEYS } from "./review-types-C75CWwOQ.mjs";
import { c as createServerFn } from "./createServerFn-BFFE07zL.mjs";
import { t as createServerRpc } from "./createServerRpc-MBa5GZ-L.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BwdutfJC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/review.functions-DrAOLeFW.js
var SYSTEM_PROMPT = `You are CodePilot AI, a senior staff engineer performing rigorous code review.
Analyse the submitted code for: bug risks, security vulnerabilities, performance problems, memory leaks,
code smells, duplicate code, naming issues, clean-code and SOLID violations, design-pattern opportunities,
refactoring wins, complexity, readability, maintainability, documentation gaps, testing gaps and best practices.

Respond with ONLY a JSON object of this exact shape:
{
  "title": "short 3-6 word title for this review",
  "summary": "2-4 sentence overall assessment",
  "scores": {
    "performance": 0-100, "security": 0-100, "maintainability": 0-100,
    "readability": 0-100, "architecture": 0-100, "documentation": 0-100, "testing": 0-100
  },
  "issues": [
    {
      "title": "short issue title",
      "category": "bug-risk|security|performance|memory-leak|code-smell|duplication|naming|clean-code|solid|design-pattern|refactoring|complexity|readability|maintainability|documentation|testing|best-practice",
      "severity": "critical|high|medium|low",
      "line": number or null,
      "explanation": "what the issue is",
      "why_it_matters": "impact if unaddressed",
      "how_to_fix": "concrete fix steps",
      "improved_code": "corrected code snippet",
      "alternative": "an alternative approach",
      "estimated_improvement": "e.g. ~30% fewer allocations"
    }
  ]
}
Return between 3 and 10 issues, most severe first. Never wrap the JSON in markdown fences.`;
function clampScore(value) {
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n)) return 70;
	return Math.max(0, Math.min(100, Math.round(n)));
}
function parseJson(raw) {
	const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
	const start = cleaned.indexOf("{");
	const end = cleaned.lastIndexOf("}");
	if (start === -1 || end === -1) throw new Error("The AI returned an unreadable response.");
	return JSON.parse(cleaned.slice(start, end + 1));
}
var runReview_createServerFn_handler = createServerRpc({
	id: "5c956485333bacd1fbe1e86d30d834b32634ccffbf31d6108166b414b93e7a21",
	name: "runReview",
	filename: "src/lib/review.functions.ts"
}, (opts) => runReview.__executeServer(opts));
var runReview = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => {
	const code = (input.code ?? "").trim();
	if (code.length < 10) throw new Error("Please provide at least 10 characters of code.");
	if (code.length > 4e4) throw new Error("Code is too large. Keep it under 40,000 characters.");
	return {
		code,
		language: (input.language || "typescript").slice(0, 40),
		source: (input.source || "paste").slice(0, 40),
		sourceRef: input.sourceRef ? input.sourceRef.slice(0, 300) : null,
		title: input.title ? input.title.slice(0, 120) : null
	};
}).handler(runReview_createServerFn_handler, async ({ data, context }) => {
	const apiKey = process.env.LOVABLE_API_KEY;
	if (!apiKey) throw new Error("AI is not configured for this project.");
	const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "google/gemini-3.6-flash",
			response_format: { type: "json_object" },
			messages: [{
				role: "system",
				content: SYSTEM_PROMPT
			}, {
				role: "user",
				content: `Language: ${data.language}\nSource: ${data.source}${data.sourceRef ? ` (${data.sourceRef})` : ""}\n\nCode:\n\`\`\`\n${data.code}\n\`\`\``
			}]
		})
	});
	if (response.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
	if (response.status === 402) throw new Error("AI credits exhausted. Add credits to continue reviewing.");
	if (!response.ok) {
		const body = await response.text();
		console.error(`AI gateway error [${response.status}]: ${body}`);
		throw new Error("The review service is temporarily unavailable.");
	}
	const parsed = parseJson((await response.json()).choices?.[0]?.message?.content ?? "");
	const rawScores = parsed.scores ?? {};
	const scores = SCORE_KEYS.reduce((acc, key) => {
		acc[key] = clampScore(rawScores[key]);
		return acc;
	}, {});
	const overall = Math.round(SCORE_KEYS.reduce((sum, key) => sum + scores[key], 0) / SCORE_KEYS.length);
	const issues = Array.isArray(parsed.issues) ? parsed.issues.slice(0, 12).map((issue) => ({
		title: String(issue.title ?? "Issue"),
		category: String(issue.category ?? "best-practice"),
		severity: String(issue.severity ?? "medium"),
		line: typeof issue.line === "number" ? issue.line : null,
		explanation: String(issue.explanation ?? ""),
		why_it_matters: String(issue.why_it_matters ?? ""),
		how_to_fix: String(issue.how_to_fix ?? ""),
		improved_code: String(issue.improved_code ?? ""),
		alternative: String(issue.alternative ?? ""),
		estimated_improvement: String(issue.estimated_improvement ?? "")
	})) : [];
	const result = {
		title: data.title || String(parsed.title ?? "Code review"),
		grade: gradeFromScore(overall),
		overall_score: overall,
		summary: String(parsed.summary ?? ""),
		scores,
		issues
	};
	const { data: saved, error } = await context.supabase.from("reviews").insert({
		user_id: context.userId,
		title: result.title,
		language: data.language,
		source: data.source,
		source_ref: data.sourceRef,
		code: data.code,
		grade: result.grade,
		overall_score: result.overall_score,
		scores: result.scores,
		summary: result.summary,
		issues: JSON.parse(JSON.stringify(result.issues))
	}).select("id, created_at").single();
	if (error) {
		console.error("Failed to save review", error);
		throw new Error("Review generated but could not be saved.");
	}
	return {
		...result,
		id: saved.id,
		created_at: saved.created_at
	};
});
//#endregion
export { runReview_createServerFn_handler };
