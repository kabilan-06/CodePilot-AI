import { f as lazyRouteComponent, p as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/history._reviewId-CbUnEbVm.js
var $$splitComponentImporter = () => import("./history._reviewId-C1vCdKxT.mjs");
var Route = createFileRoute("/_authenticated/history/$reviewId")({
	head: () => ({ meta: [
		{ title: "Review detail — CodePilot AI" },
		{
			name: "description",
			content: "Full AI review breakdown with findings, fixes and quality scores."
		},
		{
			property: "og:title",
			content: "Review detail — CodePilot AI"
		},
		{
			property: "og:description",
			content: "Full AI review breakdown with findings and fixes."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
