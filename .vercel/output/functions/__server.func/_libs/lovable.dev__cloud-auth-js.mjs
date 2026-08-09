//#region node_modules/@lovable.dev/cloud-auth-js/dist/index.js
var package_default = {
	name: "@lovable.dev/cloud-auth-js",
	version: "1.1.2",
	description: "Lovable Cloud Auth JS",
	main: "./dist/index.cjs",
	module: "./dist/index.js",
	types: "./dist/index.d.ts",
	type: "module",
	files: ["dist"],
	scripts: {
		build: "tsup src/index.ts --format cjs,esm --dts --outDir dist",
		dev: "tsup src/index.ts --format cjs,esm --dts --watch",
		test: "vitest run",
		typecheck: "tsgo --noEmit",
		prepublishOnly: "npm run clean && npm run build",
		clean: "rimraf dist"
	},
	keywords: [
		"lovable",
		"oauth",
		"authentication"
	],
	license: "MIT",
	devDependencies: {
		"@types/node": "^22",
		jsdom: "^26",
		rimraf: "^5.0.0",
		tsup: "^7.2.0",
		typescript: "^5",
		vitest: "^4.1.0"
	}
};
var EXPECTED_MESSAGE_TYPE = "authorization_response";
var DEFAULT_OAUTH_BROKER_URL = "/~oauth/initiate";
var DEFAULT_SUPPORTED_OAUTH_ORIGINS = ["https://oauth.lovable.app", "https://lovable.dev"];
var DEFAULT_MOBILE_DEEP_LINK_REDIRECT_URI = "lovable://oauth-callback";
var DEFAULT_DESKTOP_LOCALHOST_REDIRECT_URI = "http://127.0.0.1/iframe-oauth/callback";
var POPUP_CHECK_INTERVAL_MS = 500;
var IFRAME_FALLBACK_TIMEOUT_MS = 12e4;
function startWebMessageListener(supportedOrigins) {
	let resolvePromise;
	const promise = new Promise((resolve) => {
		resolvePromise = resolve;
	});
	const callback = (e) => {
		if (!supportedOrigins.some((origin) => e.origin === origin)) return;
		const data = e.data;
		if (!data || typeof data !== "object") return;
		if (data.type !== EXPECTED_MESSAGE_TYPE) return;
		resolvePromise(data.response);
	};
	const cleanup = () => {
		window.removeEventListener("message", callback);
	};
	window.addEventListener("message", callback);
	return {
		cleanup,
		messagePromise: promise
	};
}
function getPopupDimensions(isInIframe) {
	const hasBrowserPosition = window.screenX !== 0 || window.screenY !== 0 || !isInIframe;
	const width = hasBrowserPosition ? window.outerWidth * .5 : window.screen.width * .5;
	const height = hasBrowserPosition ? window.outerHeight * .5 : window.screen.height * .5;
	return {
		width,
		height,
		left: hasBrowserPosition ? window.screenX + (window.outerWidth - width) / 2 : (window.screen.width - width) / 2,
		top: hasBrowserPosition ? window.screenY + (window.outerHeight - height) / 2 : (window.screen.height - height) / 2
	};
}
function processOAuthResponse(data, expectedState) {
	if (data.state !== expectedState) return { error: /* @__PURE__ */ new Error("State is invalid") };
	if (data.error) {
		if (data.error === "legacy_flow") return { error: /* @__PURE__ */ new Error("This flow is not supported in Preview mode. Please open the app in a new tab to sign in.") };
		return { error: new Error(data.error_description ?? "Sign in failed") };
	}
	if (!data.access_token || !data.refresh_token) return { error: /* @__PURE__ */ new Error("No tokens received") };
	return {
		tokens: {
			access_token: data.access_token,
			refresh_token: data.refresh_token
		},
		error: null
	};
}
function isDevice() {
	const ua = navigator.userAgent;
	if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
	if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
	return false;
}
function generateState() {
	if (typeof crypto !== "undefined" && crypto.getRandomValues) return [...crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
	return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
function createAuth(config = {}) {
	const oauthBrokerUrl = config.oauthBrokerUrl ?? DEFAULT_OAUTH_BROKER_URL;
	const supportedOAuthOrigins = config.supportedOAuthOrigins ?? DEFAULT_SUPPORTED_OAUTH_ORIGINS;
	async function signInWithOAuth(provider, opts = {}) {
		let isInIframe = false;
		try {
			isInIframe = window.self !== window.top;
		} catch {
			isInIframe = true;
		}
		const ua = navigator.userAgent;
		const isMobileApp = /LovableApp\//.test(ua);
		const isDesktopApp = !isMobileApp && /lovable/i.test(ua);
		const state = generateState();
		let redirectUri = opts.redirect_uri ?? window.location.origin;
		if (isMobileApp && isInIframe) redirectUri = DEFAULT_MOBILE_DEEP_LINK_REDIRECT_URI;
		else if (isDesktopApp && isInIframe) redirectUri = DEFAULT_DESKTOP_LOCALHOST_REDIRECT_URI;
		const params = new URLSearchParams({
			...opts.extraParams,
			provider,
			redirect_uri: redirectUri,
			state
		});
		if (!isInIframe) {
			window.location.href = `${oauthBrokerUrl}?${params.toString()}`;
			return {
				error: null,
				redirected: true
			};
		}
		if (!isMobileApp && !isDesktopApp) params.set("response_mode", "web_message");
		const url = `${oauthBrokerUrl}?${params.toString()}`;
		const { messagePromise, cleanup } = startWebMessageListener(isDesktopApp ? [...supportedOAuthOrigins, window.location.origin] : supportedOAuthOrigins);
		let popup;
		if (isDevice()) popup = window.open(url, "_blank");
		else {
			const { width, height, left, top } = getPopupDimensions(isInIframe);
			popup = window.open(url, "oauth", `width=${width},height=${height},left=${left},top=${top}`);
		}
		if (!popup && (isMobileApp || isDesktopApp)) {
			let webViewTimeoutId;
			const webViewTimeoutPromise = new Promise((_, reject) => {
				webViewTimeoutId = setTimeout(() => {
					reject(/* @__PURE__ */ new Error("OAuth timed out waiting for response"));
				}, IFRAME_FALLBACK_TIMEOUT_MS);
			});
			try {
				return processOAuthResponse(await Promise.race([messagePromise, webViewTimeoutPromise]), state);
			} catch (error) {
				return { error: error instanceof Error ? error : new Error(String(error)) };
			} finally {
				if (webViewTimeoutId) clearTimeout(webViewTimeoutId);
				cleanup();
			}
		}
		if (!popup) {
			cleanup();
			return { error: /* @__PURE__ */ new Error("Popup was blocked") };
		}
		let popupCheckInterval;
		const popupClosedPromise = new Promise((_, reject) => {
			popupCheckInterval = setInterval(() => {
				if (popup.closed) {
					clearInterval(popupCheckInterval);
					reject(/* @__PURE__ */ new Error("Sign in was cancelled"));
				}
			}, POPUP_CHECK_INTERVAL_MS);
		});
		try {
			return processOAuthResponse(await Promise.race([messagePromise, popupClosedPromise]), state);
		} catch (error) {
			return { error: error instanceof Error ? error : new Error(String(error)) };
		} finally {
			clearInterval(popupCheckInterval);
			cleanup();
			popup?.close();
		}
	}
	return { signInWithOAuth };
}
if (typeof window !== "undefined") window.__lovable_cloud_auth_js_version = package_default.version;
function createLovableAuth(config = {}) {
	return createAuth(config);
}
//#endregion
export { createLovableAuth as t };
