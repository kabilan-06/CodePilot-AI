//#region node_modules/.nitro/vite/services/ssr/assets/theme-CIaDUAXm.js
var STORAGE_KEY = "codepilot-theme";
function getStoredTheme() {
	if (typeof window === "undefined") return "dark";
	return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}
function applyTheme(theme) {
	if (typeof document === "undefined") return;
	document.documentElement.classList.toggle("dark", theme === "dark");
	window.localStorage.setItem(STORAGE_KEY, theme);
}
var themeBootstrapScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");document.documentElement.classList.toggle("dark",t!=="light");}catch(e){document.documentElement.classList.add("dark");}})();`;
//#endregion
export { getStoredTheme as n, themeBootstrapScript as r, applyTheme as t };
