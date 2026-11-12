export const appLockStorageKey = "thinkbee-app-lock";
export const appLockSignalKey = "thinkbee-app-lock-signal";
export const appLockReadyEvent = "thinkbee-app-lock-ready";

// Runs before paint. A corrupt or unreadable setting must not reveal private UI.
export const appLockBootScript = `try{if(localStorage.getItem("${appLockStorageKey}")!==null)document.documentElement.setAttribute("data-app-lock","")}catch{document.documentElement.setAttribute("data-app-lock","")}`;
