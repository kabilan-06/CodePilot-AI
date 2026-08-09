import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const GITHUB_SCOPES = "read:user repo";
const STATE_TTL_MS = 10 * 60 * 1000;

function secret(): string {
  const value = process.env["GITHUB_TOKEN_ENC_KEY"];
  if (!value) throw new Error("GitHub integration is not configured.");
  return value;
}

function encKey(): Buffer {
  return createHash("sha256").update(secret()).digest();
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptToken(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", encKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

export function signState(userId: string): string {
  const payload = `${userId}.${Date.now() + STATE_TTL_MS}.${randomBytes(8).toString("hex")}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 4) return null;
    const [userId, expiry, nonce, sig] = parts;
    const expected = createHmac("sha256", secret())
      .update(`${userId}.${expiry}.${nonce}`)
      .digest("hex");
    const a = Buffer.from(sig!);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    if (Number(expiry) < Date.now()) return null;
    return userId!;
  } catch {
    return null;
  }
}

export function oauthClient() {
  const clientId = process.env["GITHUB_OAUTH_CLIENT_ID"];
  const clientSecret = process.env["GITHUB_OAUTH_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth is not configured for this project.");
  }
  return { clientId, clientSecret };
}

export function authorizeUrl(origin: string, state: string): string {
  const { clientId } = oauthClient();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/public/github/callback`,
    scope: GITHUB_SCOPES,
    state,
    allow_signup: "false",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(origin: string, code: string) {
  const { clientId, clientSecret } = oauthClient();
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${origin}/api/public/github/callback`,
    }),
  });
  const payload = (await response.json()) as {
    access_token?: string;
    scope?: string;
    error_description?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? "GitHub rejected the authorization code.");
  }
  return { accessToken: payload.access_token, scope: payload.scope ?? "" };
}

export async function githubFetch<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`https://api.github.com/${path.replace(/^\//, "")}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "CodePilot-AI",
    },
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(`GitHub API error [${response.status}] ${path}: ${body}`);
    if (response.status === 401)
      throw new Error("Your GitHub connection expired. Reconnect your account.");
    if (response.status === 404)
      throw new Error("Not found on GitHub, or your token lacks access.");
    if (response.status === 403) throw new Error("GitHub rate limit reached. Try again shortly.");
    throw new Error("GitHub request failed.");
  }
  return (await response.json()) as T;
}

export async function githubRaw(token: string, path: string, accept: string): Promise<string> {
  const response = await fetch(`https://api.github.com/${path.replace(/^\//, "")}`, {
    headers: {
      Accept: accept,
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "CodePilot-AI",
    },
  });
  if (!response.ok) throw new Error("Could not load that file from GitHub.");
  return await response.text();
}

export async function saveConnection(
  userId: string,
  values: {
    github_login: string;
    github_id: number | null;
    avatar_url: string | null;
    scope: string;
    accessToken: string;
  },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("github_connections").upsert(
    {
      user_id: userId,
      github_login: values.github_login,
      github_id: values.github_id,
      avatar_url: values.avatar_url,
      scope: values.scope,
      access_token_ciphertext: encryptToken(values.accessToken),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function loadConnection(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("github_connections")
    .select("github_login, avatar_url, scope, access_token_ciphertext, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteConnection(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("github_connections").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function requireToken(userId: string): Promise<string> {
  const row = await loadConnection(userId);
  if (!row) throw new Error("Connect your GitHub account first.");
  return decryptToken(row.access_token_ciphertext);
}

const SEGMENT = /^[A-Za-z0-9._-]{1,100}$/;

export function assertRepo(owner: string, repo: string) {
  if (!SEGMENT.test(owner) || !SEGMENT.test(repo)) throw new Error("Invalid repository.");
}

export function safeRef(ref: string) {
  if (!/^[A-Za-z0-9._/-]{1,250}$/.test(ref)) throw new Error("Invalid branch or ref.");
  return ref;
}

export function safePath(path: string) {
  if (path.includes("..") || path.length > 400) throw new Error("Invalid file path.");
  return path.replace(/^\/+/, "");
}
