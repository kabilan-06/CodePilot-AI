import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/github.server-CWbTz5Jn.js
var GITHUB_SCOPES = "read:user repo";
var STATE_TTL_MS = 600 * 1e3;
function secret() {
	const value = process.env["GITHUB_TOKEN_ENC_KEY"];
	if (!value) throw new Error("GitHub integration is not configured.");
	return value;
}
function encKey() {
	return createHash("sha256").update(secret()).digest();
}
function encryptToken(plaintext) {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
	const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	return Buffer.concat([
		iv,
		cipher.getAuthTag(),
		ct
	]).toString("base64");
}
function decryptToken(stored) {
	const buf = Buffer.from(stored, "base64");
	const decipher = createDecipheriv("aes-256-gcm", encKey(), buf.subarray(0, 12));
	decipher.setAuthTag(buf.subarray(12, 28));
	return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}
function signState(userId) {
	const payload = `${userId}.${Date.now() + STATE_TTL_MS}.${randomBytes(8).toString("hex")}`;
	const sig = createHmac("sha256", secret()).update(payload).digest("hex");
	return Buffer.from(`${payload}.${sig}`).toString("base64url");
}
function verifyState(state) {
	try {
		const parts = Buffer.from(state, "base64url").toString("utf8").split(".");
		if (parts.length !== 4) return null;
		const [userId, expiry, nonce, sig] = parts;
		const expected = createHmac("sha256", secret()).update(`${userId}.${expiry}.${nonce}`).digest("hex");
		const a = Buffer.from(sig);
		const b = Buffer.from(expected);
		if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
		if (Number(expiry) < Date.now()) return null;
		return userId;
	} catch {
		return null;
	}
}
function oauthClient() {
	const clientId = process.env["GITHUB_OAUTH_CLIENT_ID"];
	const clientSecret = process.env["GITHUB_OAUTH_CLIENT_SECRET"];
	if (!clientId || !clientSecret) throw new Error("GitHub OAuth is not configured for this project.");
	return {
		clientId,
		clientSecret
	};
}
function authorizeUrl(origin, state) {
	const { clientId } = oauthClient();
	return `https://github.com/login/oauth/authorize?${new URLSearchParams({
		client_id: clientId,
		redirect_uri: `${origin}/api/public/github/callback`,
		scope: GITHUB_SCOPES,
		state,
		allow_signup: "false"
	}).toString()}`;
}
async function exchangeCodeForToken(origin, code) {
	const { clientId, clientSecret } = oauthClient();
	const response = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json"
		},
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			code,
			redirect_uri: `${origin}/api/public/github/callback`
		})
	});
	const payload = await response.json();
	if (!response.ok || !payload.access_token) throw new Error(payload.error_description ?? "GitHub rejected the authorization code.");
	return {
		accessToken: payload.access_token,
		scope: payload.scope ?? ""
	};
}
async function githubFetch(token, path) {
	const response = await fetch(`https://api.github.com/${path.replace(/^\//, "")}`, { headers: {
		Accept: "application/vnd.github+json",
		Authorization: `Bearer ${token}`,
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent": "CodePilot-AI"
	} });
	if (!response.ok) {
		const body = await response.text();
		console.error(`GitHub API error [${response.status}] ${path}: ${body}`);
		if (response.status === 401) throw new Error("Your GitHub connection expired. Reconnect your account.");
		if (response.status === 404) throw new Error("Not found on GitHub, or your token lacks access.");
		if (response.status === 403) throw new Error("GitHub rate limit reached. Try again shortly.");
		throw new Error("GitHub request failed.");
	}
	return await response.json();
}
async function githubRaw(token, path, accept) {
	const response = await fetch(`https://api.github.com/${path.replace(/^\//, "")}`, { headers: {
		Accept: accept,
		Authorization: `Bearer ${token}`,
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent": "CodePilot-AI"
	} });
	if (!response.ok) throw new Error("Could not load that file from GitHub.");
	return await response.text();
}
async function saveConnection(userId, values) {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error } = await supabaseAdmin.from("github_connections").upsert({
		user_id: userId,
		github_login: values.github_login,
		github_id: values.github_id,
		avatar_url: values.avatar_url,
		scope: values.scope,
		access_token_ciphertext: encryptToken(values.accessToken),
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}, { onConflict: "user_id" });
	if (error) throw error;
}
async function loadConnection(userId) {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data, error } = await supabaseAdmin.from("github_connections").select("github_login, avatar_url, scope, access_token_ciphertext, created_at").eq("user_id", userId).maybeSingle();
	if (error) throw error;
	return data;
}
async function deleteConnection(userId) {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error } = await supabaseAdmin.from("github_connections").delete().eq("user_id", userId);
	if (error) throw error;
}
async function requireToken(userId) {
	const row = await loadConnection(userId);
	if (!row) throw new Error("Connect your GitHub account first.");
	return decryptToken(row.access_token_ciphertext);
}
var SEGMENT = /^[A-Za-z0-9._-]{1,100}$/;
function assertRepo(owner, repo) {
	if (!SEGMENT.test(owner) || !SEGMENT.test(repo)) throw new Error("Invalid repository.");
}
function safeRef(ref) {
	if (!/^[A-Za-z0-9._/-]{1,250}$/.test(ref)) throw new Error("Invalid branch or ref.");
	return ref;
}
function safePath(path) {
	if (path.includes("..") || path.length > 400) throw new Error("Invalid file path.");
	return path.replace(/^\/+/, "");
}
//#endregion
export { assertRepo, authorizeUrl, deleteConnection, exchangeCodeForToken, githubFetch, githubRaw, loadConnection, requireToken, safePath, safeRef, saveConnection, signState, verifyState };
