"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function SetupEntry() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const run = () => {
      // Supabase can fall back to its Site URL when a redirect is not allowlisted.
      // Recover a PKCE callback at Home before ordinary first-visit navigation.
      if (pathname === "/") {
        const url = new URL(location.href);
        const code = url.searchParams.get("code");
        const failed = url.href.includes("error=");
        if (code || failed) {
          const target = code ? `/auth/callback?code=${encodeURIComponent(code)}` : "/auth/callback?error=access_denied";
          location.replace(target);
          return;
        }
      }
      try {
        if (pathname === "/" && !localStorage.getItem("thinkbee-welcome-seen") && navigator.onLine) router.replace("/welcome");
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
  }, [pathname, router]);
  return null;
}
