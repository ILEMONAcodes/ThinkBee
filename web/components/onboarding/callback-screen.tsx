"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { SetupError } from "@/components/onboarding/feedback";
import { AppError } from "@/lib/api/errors";
import { completeSignIn } from "@/lib/auth/actions";
import { getSupabase } from "@/lib/auth/client";
import { useOnline } from "@/lib/hooks/use-online";
import { loadAccount } from "@/lib/onboarding/account";

export function CallbackScreen() {
  const t = useTranslations("Setup");
  const router = useRouter();
  const online = useOnline();
  const [error, setError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);
  const [takingLonger, setTakingLonger] = useState(false);
  useEffect(() => {
    let active = true;
    let recovery = false;
    let unsubscribe = () => {};
    const slowTimer = window.setTimeout(() => { if (active) setTakingLonger(true); }, 8000);
    const finish = async () => {
      const { data: listener } = getSupabase().auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") recovery = true; });
      unsubscribe = () => listener.subscription.unsubscribe();
      await completeSignIn();
      const { data } = await getSupabase().auth.getSession();
      if (!data.session) throw new AppError("link_expired");
      if (recovery) { if (active) router.replace("/auth/reset-password"); return; }
      const account = await loadAccount(data.session.user.id);
      if (!active) return;
      try { localStorage.setItem("thinkbee-welcome-seen", "1"); } catch { /* Cosmetic only. */ }
      router.replace(!account.profile && !account.profileJob ? "/setup/profile" : account.farmJob || account.profileJob ? "/setup/farm" : "/");
    };
    void finish().catch((failure: unknown) => { if (active) setError(failure); }).finally(() => clearTimeout(slowTimer));
    return () => { active = false; clearTimeout(slowTimer); unsubscribe(); };
  }, [attempt, router]);
  return <section className="setup-narrow"><h1 className="setup-title">{t("returning")}</h1>
    {!online ? <p className="mt-5" role="status">{t("connectionRequired")}</p> : null}
    {error ? <SetupError error={error} retry={() => { setError(undefined); setTakingLonger(false); setAttempt((value) => value + 1); }} /> : <p className="mt-5" role="status">{t(takingLonger ? "accountConnecting" : "loading")}</p>}
  </section>;
}
