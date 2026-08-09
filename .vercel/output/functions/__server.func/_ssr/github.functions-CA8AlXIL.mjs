import { c as createServerFn, u as getRequest } from "./createServerFn-BFFE07zL.mjs";
import { t as createServerRpc } from "./createServerRpc-MBa5GZ-L.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BwdutfJC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/github.functions-CA8AlXIL.js
var getGitHubConnection_createServerFn_handler = createServerRpc({
	id: "a5d3964aeba5e2403eff4158fdc1d8f81114091e60aed77b91ed3f91179f3ed3",
	name: "getGitHubConnection",
	filename: "src/lib/github.functions.ts"
}, (opts) => getGitHubConnection.__executeServer(opts));
var getGitHubConnection = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(getGitHubConnection_createServerFn_handler, async ({ context }) => {
	const { loadConnection } = await import("./github.server-CWbTz5Jn.mjs");
	const row = await loadConnection(context.userId);
	if (!row) return null;
	return {
		login: row.github_login,
		avatarUrl: row.avatar_url,
		scope: row.scope,
		connectedAt: row.created_at
	};
});
var startGitHubOAuth_createServerFn_handler = createServerRpc({
	id: "4e8fb107ec834a0fc0b21e89b567d0ec375e1ab8e14b54501a07323e4538f338",
	name: "startGitHubOAuth",
	filename: "src/lib/github.functions.ts"
}, (opts) => startGitHubOAuth.__executeServer(opts));
var startGitHubOAuth = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(startGitHubOAuth_createServerFn_handler, async ({ context }) => {
	const { authorizeUrl, signState } = await import("./github.server-CWbTz5Jn.mjs");
	const origin = new URL(getRequest().url).origin;
	return { url: authorizeUrl(origin, signState(context.userId)) };
});
var disconnectGitHub_createServerFn_handler = createServerRpc({
	id: "35888fe96a8afdb8a7aa61bc0fbc701d38e7e56e42039d3eb244128f14ef8854",
	name: "disconnectGitHub",
	filename: "src/lib/github.functions.ts"
}, (opts) => disconnectGitHub.__executeServer(opts));
var disconnectGitHub = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(disconnectGitHub_createServerFn_handler, async ({ context }) => {
	const { deleteConnection } = await import("./github.server-CWbTz5Jn.mjs");
	await deleteConnection(context.userId);
	return { ok: true };
});
var listGitHubRepos_createServerFn_handler = createServerRpc({
	id: "cb2e10d8a3bf2bd5497a578e673da196a2f625eaee915acdcc1105da8605c79d",
	name: "listGitHubRepos",
	filename: "src/lib/github.functions.ts"
}, (opts) => listGitHubRepos.__executeServer(opts));
var listGitHubRepos = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(listGitHubRepos_createServerFn_handler, async ({ context }) => {
	const { githubFetch, requireToken } = await import("./github.server-CWbTz5Jn.mjs");
	return (await githubFetch(await requireToken(context.userId), "user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member")).map((repo) => ({
		id: repo.id,
		name: repo.name,
		full_name: repo.full_name,
		description: repo.description,
		language: repo.language,
		stargazers_count: repo.stargazers_count,
		html_url: repo.html_url,
		default_branch: repo.default_branch,
		private: repo.private,
		updated_at: repo.updated_at
	}));
});
var listGitHubBranches_createServerFn_handler = createServerRpc({
	id: "1e7da6f76d092fbe8b68144680ee6ce703969113dde1fb8d2c3a5960e7f7f130",
	name: "listGitHubBranches",
	filename: "src/lib/github.functions.ts"
}, (opts) => listGitHubBranches.__executeServer(opts));
var listGitHubBranches = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => input).handler(listGitHubBranches_createServerFn_handler, async ({ data, context }) => {
	const { assertRepo, githubFetch, requireToken } = await import("./github.server-CWbTz5Jn.mjs");
	assertRepo(data.owner, data.repo);
	return githubFetch(await requireToken(context.userId), `repos/${data.owner}/${data.repo}/branches?per_page=100`);
});
var listGitHubCommits_createServerFn_handler = createServerRpc({
	id: "c17cce1c01dd07c5f3d318a8f7cfd5fcee74d9af683eabfbfcd0db0b8f8f82e7",
	name: "listGitHubCommits",
	filename: "src/lib/github.functions.ts"
}, (opts) => listGitHubCommits.__executeServer(opts));
var listGitHubCommits = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => input).handler(listGitHubCommits_createServerFn_handler, async ({ data, context }) => {
	const { assertRepo, githubFetch, requireToken, safeRef } = await import("./github.server-CWbTz5Jn.mjs");
	assertRepo(data.owner, data.repo);
	const ref = safeRef(data.ref);
	return githubFetch(await requireToken(context.userId), `repos/${data.owner}/${data.repo}/commits?per_page=30&sha=${encodeURIComponent(ref)}`);
});
var listGitHubPulls_createServerFn_handler = createServerRpc({
	id: "7b49fb73bfa50008d185d80cb05c7580f0f60d077b89c59db2987bf8b68e4142",
	name: "listGitHubPulls",
	filename: "src/lib/github.functions.ts"
}, (opts) => listGitHubPulls.__executeServer(opts));
var listGitHubPulls = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => input).handler(listGitHubPulls_createServerFn_handler, async ({ data, context }) => {
	const { assertRepo, githubFetch, requireToken } = await import("./github.server-CWbTz5Jn.mjs");
	assertRepo(data.owner, data.repo);
	const state = [
		"open",
		"closed",
		"all"
	].includes(data.state) ? data.state : "open";
	return githubFetch(await requireToken(context.userId), `repos/${data.owner}/${data.repo}/pulls?per_page=30&state=${state}&sort=updated&direction=desc`);
});
var listGitHubTree_createServerFn_handler = createServerRpc({
	id: "f13a13259bcbec88f1b81ca5a0d525ad9ce2148a083b81362562586b21582374",
	name: "listGitHubTree",
	filename: "src/lib/github.functions.ts"
}, (opts) => listGitHubTree.__executeServer(opts));
var listGitHubTree = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => input).handler(listGitHubTree_createServerFn_handler, async ({ data, context }) => {
	const { assertRepo, githubFetch, requireToken, safePath, safeRef } = await import("./github.server-CWbTz5Jn.mjs");
	assertRepo(data.owner, data.repo);
	const ref = safeRef(data.ref);
	const path = safePath(data.path ?? "");
	const entries = await githubFetch(await requireToken(context.userId), `repos/${data.owner}/${data.repo}/contents/${path}?ref=${encodeURIComponent(ref)}`);
	return (Array.isArray(entries) ? entries : [entries]).map((entry) => ({
		name: entry.name,
		path: entry.path,
		type: entry.type,
		size: entry.size
	})).sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1);
});
var getGitHubFile_createServerFn_handler = createServerRpc({
	id: "29c7c44b065b84857e909b7189f7bf026be44052ced6fe10fde57aee80e9cc78",
	name: "getGitHubFile",
	filename: "src/lib/github.functions.ts"
}, (opts) => getGitHubFile.__executeServer(opts));
var getGitHubFile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => input).handler(getGitHubFile_createServerFn_handler, async ({ data, context }) => {
	const { assertRepo, githubRaw, requireToken, safePath, safeRef } = await import("./github.server-CWbTz5Jn.mjs");
	assertRepo(data.owner, data.repo);
	const ref = safeRef(data.ref);
	const path = safePath(data.path);
	const content = await githubRaw(await requireToken(context.userId), `repos/${data.owner}/${data.repo}/contents/${path}?ref=${encodeURIComponent(ref)}`, "application/vnd.github.raw");
	if (content.length > 4e4) throw new Error("That file is too large (max 40,000 characters).");
	return {
		path,
		content
	};
});
var getGitHubPullDiff_createServerFn_handler = createServerRpc({
	id: "70a6255b393e8c540b6dee12b302423545f95af59832f2eafc6e294576395a21",
	name: "getGitHubPullDiff",
	filename: "src/lib/github.functions.ts"
}, (opts) => getGitHubPullDiff.__executeServer(opts));
var getGitHubPullDiff = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => input).handler(getGitHubPullDiff_createServerFn_handler, async ({ data, context }) => {
	const { assertRepo, githubRaw, requireToken } = await import("./github.server-CWbTz5Jn.mjs");
	assertRepo(data.owner, data.repo);
	if (!Number.isInteger(data.number) || data.number < 1) throw new Error("Invalid pull request.");
	const diff = await githubRaw(await requireToken(context.userId), `repos/${data.owner}/${data.repo}/pulls/${data.number}`, "application/vnd.github.diff");
	if (diff.length > 4e4) throw new Error("That pull request diff is too large to review.");
	return {
		path: `PR #${data.number}`,
		content: diff
	};
});
//#endregion
export { disconnectGitHub_createServerFn_handler, getGitHubConnection_createServerFn_handler, getGitHubFile_createServerFn_handler, getGitHubPullDiff_createServerFn_handler, listGitHubBranches_createServerFn_handler, listGitHubCommits_createServerFn_handler, listGitHubPulls_createServerFn_handler, listGitHubRepos_createServerFn_handler, listGitHubTree_createServerFn_handler, startGitHubOAuth_createServerFn_handler };
