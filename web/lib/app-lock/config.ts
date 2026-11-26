export const appLockStorageKey = "thinkbee-app-lock";
export const appLockSignalKey = "thinkbee-app-lock-signal";
export const appLockReadyEvent = "thinkbee-app-lock-ready";

// Runs before paint. A corrupt or unreadable setting must not reveal private UI.
// Only set data-app-lock if the lock key EXISTS in localStorage. If localStorage is unavailable, fail closed but don't block on missing key.
export const appLockBootScript = `try{const v=localStorage.getItem("${appLockStorageKey}");if(v!==null)document.documentElement.setAttribute("data-app-lock","")}catch{}`;
