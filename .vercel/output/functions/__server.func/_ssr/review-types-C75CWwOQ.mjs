//#region node_modules/.nitro/vite/services/ssr/assets/review-types-C75CWwOQ.js
var LANGUAGES = [
	"java",
	"python",
	"javascript",
	"typescript",
	"cpp",
	"csharp",
	"go",
	"rust",
	"php",
	"sql",
	"html",
	"css",
	"react",
	"spring-boot"
];
var SCORE_KEYS = [
	"performance",
	"security",
	"maintainability",
	"readability",
	"architecture",
	"documentation",
	"testing"
];
var SCORE_LABELS = {
	performance: "Performance",
	security: "Security",
	maintainability: "Maintainability",
	readability: "Readability",
	architecture: "Architecture",
	documentation: "Documentation",
	testing: "Testing"
};
function gradeFromScore(score) {
	if (score >= 93) return "A+";
	if (score >= 85) return "A";
	if (score >= 72) return "B";
	if (score >= 60) return "C";
	return "D";
}
function severityTone(severity) {
	switch (severity) {
		case "critical":
		case "high": return "text-destructive border-destructive/40 bg-destructive/10";
		case "medium": return "text-warning border-warning/40 bg-warning/10";
		default: return "text-success border-success/40 bg-success/10";
	}
}
//#endregion
export { severityTone as a, gradeFromScore as i, SCORE_KEYS as n, SCORE_LABELS as r, LANGUAGES as t };
