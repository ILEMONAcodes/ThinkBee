"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { resetLockedDevice } from "@/lib/app-lock/session";
import { useLockFeedback } from "@/lib/hooks/use-lock-feedback";
import { useOnline } from "@/lib/hooks/use-online";

export function LockRecovery({ onCancel }: Readonly<{ onCancel: () => void }>) {
  const t = useTranslations("AppLock");
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const { message } = useLockFeedback(error);
  const reset = async () => {
    setBusy(true); setError(undefined);
    try { await resetLockedDevice(); }
    catch (failure) { setError(failure); setBusy(false); }
  };
  return <div className="lock-recovery">
    <h2 ref={heading} tabIndex={-1} className="font-display text-2xl">{t("recoveryTitle")}</h2>
    <p className="mt-4 text-subtle">{t("recoveryBody")}</p>
    {!online ? <p className="lock-notice" role="status">{t("recoveryOffline")}</p> : null}
    {message ? <p className="lock-error" role="alert">{message}</p> : null}
    <div className="lock-actions">
      <button className="lock-secondary" type="button" disabled={busy} onClick={onCancel}>{t("keepDevice")}</button>
      <button className="lock-danger" type="button" disabled={!online || busy} onClick={() => void reset()}>{t(busy ? "resetting" : "resetDevice")}</button>
    </div>
  </div>;
}
