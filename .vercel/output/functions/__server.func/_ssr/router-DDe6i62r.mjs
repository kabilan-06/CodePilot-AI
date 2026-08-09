import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { i as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { _ as useRouter, c as HeadContent, d as Outlet, f as lazyRouteComponent, h as Link, m as createRootRouteWithContext, p as createFileRoute, s as Scripts, u as createRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Route$11 } from "./auth-C-nFDFvo.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { t as Route$12 } from "./history._reviewId-CbUnEbVm.mjs";
import { t as Route$13 } from "./repositories-VjLnWDO5.mjs";
import { r as themeBootstrapScript } from "./theme-CIaDUAXm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-DDe6i62r.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-CV3g1T6y.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
	const message = error instanceof Response ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` : error instanceof Error ? error.message : String(error);
	window.__lovableReportRuntimeError?.({
		message,
		stack: error instanceof Error ? error.stack : void 0,
		filename: window.location.pathname
	});
}
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$10 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "CodePilot AI — AI-Powered Code Review & PR Assistant" },
			{
				name: "description",
				content: "CodePilot AI reviews your code and pull requests in seconds, scoring security, performance, architecture and more."
			},
			{
				name: "author",
				content: "CodePilot AI"
			},
			{
				property: "og:title",
				content: "CodePilot AI — AI-Powered Code Review & PR Assistant"
			},
			{
				property: "og:description",
				content: "CodePilot AI reviews your code and pull requests in seconds, scoring security, performance, architecture and more."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:site",
				content: "@Lovable"
			},
			{
				name: "twitter:title",
				content: "CodePilot AI — AI-Powered Code Review & PR Assistant"
			},
			{
				name: "twitter:description",
				content: "CodePilot AI reviews your code and pull requests in seconds, scoring security, performance, architecture and more."
			},
			{
				property: "og:image",
				content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/997c9c29-8af6-474b-8e5d-6f5cf06fa05f/id-preview-36b7756c--f3a70c00-eac7-479e-a4cf-7c6c76467abe.lovable.app-1785325026173.png"
			},
			{
				name: "twitter:image",
				content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/997c9c29-8af6-474b-8e5d-6f5cf06fa05f/id-preview-36b7756c--f3a70c00-eac7-479e-a4cf-7c6c76467abe.lovable.app-1785325026173.png"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap"
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		className: "dark",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("head", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("script", { dangerouslySetInnerHTML: { __html: themeBootstrapScript } }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$10.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, {
			position: "top-right",
			richColors: true
		})]
	});
}
var $$splitComponentImporter$6 = () => import("./routes-CdT0MSON.mjs");
var Route$9 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./route-DJBxjueP.mjs");
var Route$8 = createFileRoute("/_authenticated")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var BASE_URL = "";
var Route$7 = createFileRoute("/sitemap.xml")({ server: { handlers: { GET: async () => {
	const xml = [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
		...[{
			path: "/",
			changefreq: "weekly",
			priority: "1.0"
		}, {
			path: "/auth",
			changefreq: "monthly",
			priority: "0.5"
		}].map((e) => [
			`  <url>`,
			`    <loc>${BASE_URL}${e.path}</loc>`,
			e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
			e.priority ? `    <priority>${e.priority}</priority>` : null,
			`  </url>`
		].filter(Boolean).join("\n")),
		`</urlset>`
	].join("\n");
	return new Response(xml, { headers: {
		"Content-Type": "application/xml",
		"Cache-Control": "public, max-age=3600"
	} });
} } } });
var $$splitComponentImporter$4 = () => import("./analytics-ug_E-b5u.mjs");
var Route$6 = createFileRoute("/_authenticated/analytics")({
	head: () => ({ meta: [
		{ title: "Analytics — CodePilot AI" },
		{
			name: "description",
			content: "Quality trends, severity mix and category hotspots across your reviews."
		},
		{
			property: "og:title",
			content: "Analytics — CodePilot AI"
		},
		{
			property: "og:description",
			content: "Quality trends and severity mix across your reviews."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./dashboard-CNUF-hRd.mjs");
var Route$5 = createFileRoute("/_authenticated/dashboard")({
	head: () => ({ meta: [
		{ title: "Dashboard — CodePilot AI" },
		{
			name: "description",
			content: "Track code health, review volume and open findings across your codebase."
		},
		{
			property: "og:title",
			content: "Dashboard — CodePilot AI"
		},
		{
			property: "og:description",
			content: "Track code health, review volume and open findings."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./history-DPPZeveW.mjs");
var Route$4 = createFileRoute("/_authenticated/history")({
	head: () => ({ meta: [
		{ title: "Review history — CodePilot AI" },
		{
			name: "description",
			content: "Search, filter and revisit every AI code review you have run."
		},
		{
			property: "og:title",
			content: "Review history — CodePilot AI"
		},
		{
			property: "og:description",
			content: "Search and revisit every AI code review you have run."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./review-CNynMxq1.mjs");
var Route$3 = createFileRoute("/_authenticated/review")({
	head: () => ({ meta: [
		{ title: "AI Code Review — CodePilot AI" },
		{
			name: "description",
			content: "Paste code or a GitHub file URL and get a deep AI review in seconds."
		},
		{
			property: "og:title",
			content: "AI Code Review — CodePilot AI"
		},
		{
			property: "og:description",
			content: "Paste code or a GitHub file URL and get a deep AI review."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./settings-CUQlOa8X.mjs");
var Route$2 = createFileRoute("/_authenticated/settings")({
	head: () => ({ meta: [
		{ title: "Settings — CodePilot AI" },
		{
			name: "description",
			content: "Manage your CodePilot AI profile, display name and account session."
		},
		{
			property: "og:title",
			content: "Settings — CodePilot AI"
		},
		{
			property: "og:description",
			content: "Manage your CodePilot AI profile and account."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var Route$1 = createFileRoute("/api/health")({ server: { handlers: { GET: () => Response.json({ status: "ok" }, { headers: { "cache-control": "no-store" } }) } } });
function back(origin, status) {
	return new Response(null, {
		status: 302,
		headers: { Location: `${origin}/repositories?github=${status}` }
	});
}
var Route = createFileRoute("/api/public/github/callback")({ server: { handlers: { GET: async ({ request }) => {
	const url = new URL(request.url);
	const origin = url.origin;
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	if (url.searchParams.get("error") || !code || !state) return back(origin, "denied");
	const { verifyState, exchangeCodeForToken, githubFetch, saveConnection } = await import("./github.server-CWbTz5Jn.mjs");
	const userId = verifyState(state);
	if (!userId) return back(origin, "invalid_state");
	try {
		const { accessToken, scope } = await exchangeCodeForToken(origin, code);
		const profile = await githubFetch(accessToken, "user");
		await saveConnection(userId, {
			github_login: profile.login,
			github_id: profile.id,
			avatar_url: profile.avatar_url,
			scope,
			accessToken
		});
		return back(origin, "connected");
	} catch (error) {
		console.error("GitHub OAuth callback failed", error);
		return back(origin, "failed");
	}
} } } });
var IndexRoute = Route$9.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$10
});
var AuthenticatedRouteRoute = Route$8.update({
	id: "/_authenticated",
	getParentRoute: () => Route$10
});
var AuthRoute = Route$11.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$10
});
var SitemapDotxmlRoute = Route$7.update({
	id: "/sitemap.xml",
	path: "/sitemap.xml",
	getParentRoute: () => Route$10
});
var AuthenticatedAnalyticsRoute = Route$6.update({
	id: "/analytics",
	path: "/analytics",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedDashboardRoute = Route$5.update({
	id: "/dashboard",
	path: "/dashboard",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedHistoryRoute = Route$4.update({
	id: "/history",
	path: "/history",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedRepositoriesRoute = Route$13.update({
	id: "/repositories",
	path: "/repositories",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedReviewRoute = Route$3.update({
	id: "/review",
	path: "/review",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedSettingsRoute = Route$2.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => AuthenticatedRouteRoute
});
var ApiHealthRoute = Route$1.update({
	id: "/api/health",
	path: "/api/health",
	getParentRoute: () => Route$10
});
var AuthenticatedHistoryReviewIdRoute = Route$12.update({
	id: "/$reviewId",
	path: "/$reviewId",
	getParentRoute: () => AuthenticatedHistoryRoute
});
var ApiPublicGithubCallbackRoute = Route.update({
	id: "/api/public/github/callback",
	path: "/api/public/github/callback",
	getParentRoute: () => Route$10
});
var AuthenticatedHistoryRouteChildren = { AuthenticatedHistoryReviewIdRoute };
var AuthenticatedRouteRouteChildren = {
	AuthenticatedAnalyticsRoute,
	AuthenticatedDashboardRoute,
	AuthenticatedHistoryRoute: AuthenticatedHistoryRoute._addFileChildren(AuthenticatedHistoryRouteChildren),
	AuthenticatedRepositoriesRoute,
	AuthenticatedReviewRoute,
	AuthenticatedSettingsRoute
};
var rootRouteChildren = {
	IndexRoute,
	AuthenticatedRouteRoute: AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren),
	AuthRoute,
	SitemapDotxmlRoute,
	ApiHealthRoute,
	ApiPublicGithubCallbackRoute
};
var routeTree = Route$10._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
