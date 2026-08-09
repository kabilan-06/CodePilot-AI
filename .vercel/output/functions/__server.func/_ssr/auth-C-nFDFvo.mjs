import { f as lazyRouteComponent, p as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as objectType, t as enumType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-C-nFDFvo.js
var $$splitComponentImporter = () => import("./auth-CKtWocJj.mjs");
var searchSchema = objectType({ mode: enumType(["signin", "signup"]).optional() });
var Route = createFileRoute("/auth")({
	validateSearch: searchSchema,
	head: () => ({ meta: [
		{ title: "Sign in — CodePilot AI" },
		{
			name: "description",
			content: "Sign in to CodePilot AI to review code and pull requests with AI."
		},
		{
			property: "og:title",
			content: "Sign in — CodePilot AI"
		},
		{
			property: "og:description",
			content: "Sign in to review code and pull requests with AI."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
