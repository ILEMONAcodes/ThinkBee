// Deferred so the optional lock does not push Home's initial JS over budget.
export function startSetupEntry(): () => void {
  const run = () => {
    try {
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
