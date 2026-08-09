//#region node_modules/.nitro/vite/services/ssr/assets/__23tanstack-start-server-fn-resolver-CY0UU5OF.js
var manifest = {
	"1e7da6f76d092fbe8b68144680ee6ce703969113dde1fb8d2c3a5960e7f7f130": {
		functionName: "listGitHubBranches_createServerFn_handler",
		importer: () => import("./_ssr/github.functions-CA8AlXIL.mjs")
	},
	"29c7c44b065b84857e909b7189f7bf026be44052ced6fe10fde57aee80e9cc78": {
		functionName: "getGitHubFile_createServerFn_handler",
		importer: () => import("./_ssr/github.functions-CA8AlXIL.mjs")
	},
	"35888fe96a8afdb8a7aa61bc0fbc701d38e7e56e42039d3eb244128f14ef8854": {
		functionName: "disconnectGitHub_createServerFn_handler",
		importer: () => import("./_ssr/github.functions-CA8AlXIL.mjs")
	},
	"4e8fb107ec834a0fc0b21e89b567d0ec375e1ab8e14b54501a07323e4538f338": {
		functionName: "startGitHubOAuth_createServerFn_handler",
		importer: () => import("./_ssr/github.functions-CA8AlXIL.mjs")
	},
	"5c956485333bacd1fbe1e86d30d834b32634ccffbf31d6108166b414b93e7a21": {
		functionName: "runReview_createServerFn_handler",
		importer: () => import("./_ssr/review.functions-DrAOLeFW.mjs")
	},
	"70a6255b393e8c540b6dee12b302423545f95af59832f2eafc6e294576395a21": {
		functionName: "getGitHubPullDiff_createServerFn_handler",
		importer: () => import("./_ssr/github.functions-CA8AlXIL.mjs")
	},
	"7b49fb73bfa50008d185d80cb05c7580f0f60d077b89c59db2987bf8b68e4142": {
		functionName: "listGitHubPulls_createServerFn_handler",
		importer: () => import("./_ssr/github.functions-CA8AlXIL.mjs")
	},
	"a5d3964aeba5e2403eff4158fdc1d8f81114091e60aed77b91ed3f91179f3ed3": {
		functionName: "getGitHubConnection_createServerFn_handler",
		importer: () => import("./_ssr/github.functions-CA8AlXIL.mjs")
	},
	"c17cce1c01dd07c5f3d318a8f7cfd5fcee74d9af683eabfbfcd0db0b8f8f82e7": {
		functionName: "listGitHubCommits_createServerFn_handler",
		importer: () => import("./_ssr/github.functions-CA8AlXIL.mjs")
	},
	"cb2e10d8a3bf2bd5497a578e673da196a2f625eaee915acdcc1105da8605c79d": {
		functionName: "listGitHubRepos_createServerFn_handler",
		importer: () => import("./_ssr/github.functions-CA8AlXIL.mjs")
	},
	"f13a13259bcbec88f1b81ca5a0d525ad9ce2148a083b81362562586b21582374": {
		functionName: "listGitHubTree_createServerFn_handler",
		importer: () => import("./_ssr/github.functions-CA8AlXIL.mjs")
	}
};
async function getServerFnById(id, access) {
	const serverFnInfo = manifest[id];
	if (!serverFnInfo) throw new Error("Server function info not found for " + id);
	const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
	if (!fnModule) throw new Error("Server function module not resolved for " + id);
	const action = fnModule[serverFnInfo.functionName];
	if (!action) throw new Error("Server function module export not resolved for serverFn ID: " + id);
	return action;
}
//#endregion
export { getServerFnById as t };
