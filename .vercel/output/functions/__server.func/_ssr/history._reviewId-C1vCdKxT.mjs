import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { t as Card } from "./card-CzXpCsbD.mjs";
import { r as useQuery } from "../_libs/tanstack__react-query.mjs";
import { a as toMarkdown, n as downloadFile, r as reviewQuery } from "./reviews-C9RR1t_a.mjs";
import { h as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Button } from "./button-Bq5vK6RO.mjs";
import { E as Download, P as ArrowLeft } from "../_libs/lucide-react.mjs";
import { r as ReviewDetail } from "./review-detail-BuKf0OHU.mjs";
import { t as Route } from "./history._reviewId-CbUnEbVm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/history._reviewId-C1vCdKxT.js
var import_jsx_runtime = require_jsx_runtime();
function ReviewDetailPage() {
	const { reviewId } = Route.useParams();
	const { data, isLoading, error } = useQuery(reviewQuery(reviewId));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-5xl space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					variant: "ghost",
					size: "sm",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/history",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-4" }), "Back to history"]
					})
				}), data && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					size: "sm",
					onClick: () => downloadFile(`${data.title.replace(/\s+/g, "-")}.md`, toMarkdown(data)),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4" }), "Export report"]
				})]
			}),
			isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Loading review…"
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "glass-panel p-8 text-center text-sm text-muted-foreground",
				children: "This review could not be found."
			}),
			data && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReviewDetail, { review: data }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "glass-panel p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-3 text-sm font-semibold text-muted-foreground",
					children: "Reviewed code"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "max-h-96 overflow-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs",
					children: data.code
				})]
			})] })
		]
	});
}
//#endregion
export { ReviewDetailPage as component };
