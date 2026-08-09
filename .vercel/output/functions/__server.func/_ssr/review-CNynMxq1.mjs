import { i as __toESM } from "../_runtime.mjs";
import { t as LANGUAGES } from "./review-types-C75CWwOQ.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { t as Card } from "./card-CzXpCsbD.mjs";
import { a as useQueryClient, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { a as toMarkdown, n as downloadFile } from "./reviews-C9RR1t_a.mjs";
import { g as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Button } from "./button-Bq5vK6RO.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { E as Download, m as LoaderCircle, o as Sparkles } from "../_libs/lucide-react.mjs";
import { r as ReviewDetail } from "./review-detail-BuKf0OHU.mjs";
import { c as createServerFn } from "./createServerFn-BFFE07zL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BwdutfJC.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { a as TabsTrigger, i as TabsList, n as Tabs, o as createSsrRpc, r as TabsContent, s as useServerFn, t as PENDING_REVIEW_KEY } from "./github-types-CVi2GN0e.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/review-CNynMxq1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Textarea.displayName = "Textarea";
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
}).handler(createSsrRpc("5c956485333bacd1fbe1e86d30d834b32634ccffbf31d6108166b414b93e7a21"));
function parseGithubUrl(url) {
	const match = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/);
	if (!match) return null;
	const [, owner, repo, ref, path] = match;
	return {
		raw: `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`,
		path
	};
}
function ReviewPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const review = useServerFn(runReview);
	const [code, setCode] = (0, import_react.useState)("");
	const [language, setLanguage] = (0, import_react.useState)("typescript");
	const [title, setTitle] = (0, import_react.useState)("");
	const [githubUrl, setGithubUrl] = (0, import_react.useState)("");
	const [source, setSource] = (0, import_react.useState)("paste");
	const [fetching, setFetching] = (0, import_react.useState)(false);
	const [result, setResult] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const stored = sessionStorage.getItem(PENDING_REVIEW_KEY);
		if (!stored) return;
		sessionStorage.removeItem(PENDING_REVIEW_KEY);
		try {
			const pending = JSON.parse(stored);
			setCode(pending.code);
			setTitle(pending.title);
			setGithubUrl(pending.sourceRef);
			setSource("github");
			toast.success(`Imported ${pending.title} from GitHub`);
		} catch {}
	}, []);
	const mutation = useMutation({
		mutationFn: async () => review({ data: {
			code,
			language,
			source,
			sourceRef: source === "github" ? githubUrl : null,
			title: title || void 0
		} }),
		onSuccess: (data) => {
			setResult({
				...data,
				language,
				source,
				source_ref: source === "github" ? githubUrl : null,
				code
			});
			queryClient.invalidateQueries({ queryKey: ["reviews"] });
			toast.success(`Review complete — grade ${data.grade}`);
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Review failed")
	});
	async function importFromGithub() {
		const parsed = parseGithubUrl(githubUrl.trim());
		if (!parsed) {
			toast.error("Paste a GitHub file URL like https://github.com/owner/repo/blob/main/src/App.tsx");
			return;
		}
		setFetching(true);
		try {
			const response = await fetch(parsed.raw);
			if (!response.ok) throw new Error("File not found or the repository is private.");
			const text = await response.text();
			if (text.length > 4e4) throw new Error("That file is too large (max 40,000 characters).");
			setCode(text);
			setSource("github");
			if (!title) setTitle(parsed.path.split("/").pop() ?? "");
			toast.success("File imported from GitHub");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Import failed");
		} finally {
			setFetching(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-6xl space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold",
				children: "AI Code Review"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted-foreground",
				children: "Paste a snippet or import a file from GitHub. CodePilot returns graded, line-aware findings."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "glass-panel p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
						value: source,
						onValueChange: (value) => setSource(value),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "paste",
								children: "Paste code"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "github",
								children: "From GitHub"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
								value: "github",
								className: "mt-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "gh",
									children: "GitHub file URL"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 flex flex-col gap-2 sm:flex-row",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "gh",
										value: githubUrl,
										onChange: (e) => setGithubUrl(e.target.value),
										placeholder: "https://github.com/owner/repo/blob/main/src/App.tsx",
										className: "font-mono text-xs"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "outline",
										onClick: importFromGithub,
										disabled: fetching,
										children: [fetching && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }), "Import"]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
								value: "paste",
								className: "mt-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Paste up to 40,000 characters of code below."
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 grid gap-4 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "title",
								children: "Title (optional)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "title",
								value: title,
								onChange: (e) => setTitle(e.target.value),
								placeholder: "Checkout service refactor",
								maxLength: 120
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "language",
								children: "Language"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: language,
								onValueChange: setLanguage,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
									id: "language",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: LANGUAGES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: item,
									className: "font-mono text-xs",
									children: item
								}, item)) })]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "code",
								children: "Code"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								id: "code",
								value: code,
								onChange: (e) => setCode(e.target.value),
								placeholder: "// paste your code here",
								className: "min-h-72 font-mono text-xs"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-right font-mono text-xs text-muted-foreground",
								children: [code.length.toLocaleString(), " / 40,000"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex flex-wrap gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: () => mutation.mutate(),
							disabled: mutation.isPending || code.trim().length < 10,
							children: [mutation.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-4" }), mutation.isPending ? "Analyzing…" : "Run AI review"]
						}), result && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: () => downloadFile(`${result.title.replace(/\s+/g, "-")}.md`, toMarkdown(result)),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4" }), "Export report"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							onClick: () => navigate({ to: "/history" }),
							children: "View history"
						})] })]
					})
				]
			}),
			result && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReviewDetail, { review: result })
		]
	});
}
//#endregion
export { ReviewPage as component };
