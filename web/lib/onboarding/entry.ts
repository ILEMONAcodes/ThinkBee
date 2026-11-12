// Deferred so the optional lock does not push Home's initial JS over budget.
export function startSetupEntry(pathname: string, replace: (href: string) => void): () => void {
  const run = () => {
    // Supabase may return to its Site URL. Recover a PKCE callback before welcome.
    if (pathname === "/") {
      const url = new URL(location.href);
      const code = url.searchParams.get("code");
      if (code || url.href.includes("error=")) {
        location.replace(code ? `/auth/callback?code=${encodeURIComponent(code)}` : "/auth/callback?error=access_denied");
        return;
      }
    }
    try {
      if (pathname === "/" && !localStorage.getItem("thinkbee-welcome-seen") && navigator.onLine) replace("/welcome");
      if (localStorage.getItem("thinkbee-setup-pending") && document.visibilityState !== "hidden") {
        void import("@/lib/onboarding/background").then(({ syncPendingSetup }) => syncPendingSetup()).catch(() => undefined);
      }
    } catch { /* Blocked preferences must not trap a visitor in onboarding. */ }
  };
  run();
  addEventListener("online", run);
  document.addEventListener("visibilitychange", run);
  const timer = setInterval(run, 60_000);
  return () => { removeEventListener("online", run); document.removeEventListener("visibilitychange", run); clearInterval(timer); };
}
