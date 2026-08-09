import { f as lazyRouteComponent, p as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/repositories-VjLnWDO5.js
var $$splitComponentImporter = () => import("./repositories-OYdMZedq.mjs");
var Route = createFileRoute("/_authenticated/repositories")({
	validateSearch: (search) => ({ github: typeof search["github"] === "string" ? search["github"] : void 0 }),
	head: () => ({ meta: [
		{ title: "Repositories — CodePilot AI" },
		{
			name: "description",
			content: "Browse public GitHub repositories and pull files straight into a review."
		},
		{
			property: "og:title",
			content: "Repositories — CodePilot AI"
		},
		{
			property: "og:description",
			content: "Browse GitHub repositories and review their files with AI."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
