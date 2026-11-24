"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";

import { AccountProvider, useIdentity } from "@/components/auth/account-provider";
import { BrandLoader } from "@/components/ui/brand-loader";
import { AppError, errorKey } from "@/lib/api/errors";
import { useOnline } from "@/lib/hooks/use-online";
import { loadAccount } from "@/lib/onboarding/account";

function ProtectedContent({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTranslations("Setup");
  const router = useRouter();
  const pathname = usePathname();
  const redirectingCallback = useRef(false);
  const { owner, ready, error: identityError } = useIdentity();
  const online = useOnline();
  const account = useQuery({
    queryKey: ["account", owner],
    enabled: !!owner,
    queryFn: () => loadAccount(owner!),
    networkMode: "always",
    refetchOnReconnect: "always",
  });
  const rejected = account.error instanceof AppError && account.error.status === 401 && account.error.code !== "account_changed";

  useEffect(() => {
    if (pathname === "/") {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code || url.searchParams.has("error")) {
        if (!redirectingCallback.current) {
          redirectingCallback.current = true;
          window.location.replace(code ? `/auth/callback?code=${encodeURIComponent(code)}` : "/auth/callback?error=access_denied");
        }
        return;
      }
    }
    if (rejected) {
      // Clear a rejected SDK session before Sign in can reuse it.
      let active = true;
      void import("@/lib/auth/client").then(async ({ getSupabase }) => {
        if (!active) return;
        const auth = getSupabase().auth;
        const { data } = await auth.getSession();
        if (!active || data.session?.user.id !== owner) return;
        const { error } = await auth.signOut({ scope: "local" });
        if (!error && active) router.replace("/sign-in");
      })
        .catch(() => undefined);
      return () => { active = false; };
    }
    if (!ready || owner || !online) return;
    let showWelcome = false;
    try { showWelcome = pathname === "/" && !localStorage.getItem("thinkbee-welcome-seen"); } catch { /* Sign in is still available. */ }
    router.replace(showWelcome ? "/welcome" : "/sign-in");
  }, [online, owner, pathname, ready, rejected, router]);

  const failure = identityError || account.error;
  if (ready && owner && account.isSuccess && !failure) return <div key={owner} className="contents">{children}</div>;
  if (ready && (!online || failure)) {
    return (
      <main className="mx-auto max-w-md p-8 text-app-text">
        <p role="status">{t(!online ? "connectionRequired" : `errors.${errorKey(failure)}`)}</p>
        {online && owner && !rejected ? <button className="mt-4 min-h-12 font-semibold text-link" onClick={() => void account.refetch()}>{t("retry")}</button> : null}
      </main>
    );
  }
  return <BrandLoader className="min-h-dvh" />;
}

export function AccountGate({ children }: Readonly<{ children: ReactNode }>) {
  return <AccountProvider><ProtectedContent>{children}</ProtectedContent></AccountProvider>;
}
