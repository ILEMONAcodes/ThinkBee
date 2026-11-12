"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { signOutOnDevice } from "@/lib/app-lock/session";

export function SignOutButton({ pending, onError }: Readonly<{ pending: boolean; onError: (error: unknown) => void }>) {
  const t = useTranslations("Setup");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    setBusy(true);
    try {
      await signOutOnDevice();
    } catch (error) { onError(error); }
    finally { setBusy(false); }
  };
  return <div className="mt-6">
    <button className="setup-secondary" type="button" disabled={busy} onClick={() => { if (pending) setConfirm(true); else void signOut(); }}>{t("signOut")}</button>
    {confirm ? <div className="setup-feedback" role="alert"><p>{t("signOutWarning")}</p><div className="mt-4 flex flex-wrap gap-3"><button className="setup-secondary" type="button" disabled={busy} onClick={() => setConfirm(false)}>{t("keepDrafts")}</button><button className="setup-primary" type="button" disabled={busy} onClick={() => void signOut()}>{t("discardSignOut")}</button></div></div> : null}
  </div>;
}
