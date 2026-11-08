"use client";

import { EnvelopeSimpleOpen } from "@phosphor-icons/react/dist/csr/EnvelopeSimpleOpen";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { AuthError } from "@/components/onboarding/auth-error";
import { resendVerification } from "@/lib/auth/actions";
import { useOnline } from "@/lib/hooks/use-online";

export function VerificationNotice({ email, onBack, initialCooldown = 60 }: Readonly<{ email: string; onBack: () => void; initialCooldown?: number }>) {
  const t = useTranslations("Setup");
  const online = useOnline();
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const resend = async () => {
    if (busy || cooldown > 0 || !online) return;
    setBusy(true); setError(undefined);
    try { await resendVerification(email); }
    catch (failure) { setError(failure); }
    finally { setBusy(false); setCooldown(60); }
  };
  return <section className="auth-form auth-email-sent">
    <EnvelopeSimpleOpen className="auth-mail-mark" size={48} aria-hidden="true" />
    <p className="setup-kicker">{t("emailStep")}</p><h1 className="auth-title" tabIndex={-1} ref={heading}>{t("verifyTitle")}</h1>
    <p className="auth-description">{t("sentTo")} <strong className="break-all">{email}</strong></p>
    <p className="auth-email-instruction">{t("sameDevice")}</p>
    {!online ? <p className="setup-feedback" role="status">{t("connectionRequired")}</p> : null}
    {error ? <AuthError error={error} /> : null}
    <button className="setup-primary mt-8 w-full" disabled={busy || cooldown > 0 || !online} onClick={() => void resend()} type="button">{busy ? t("sending") : cooldown ? t("resendIn", { seconds: cooldown }) : t("resend")}</button>
    <button className="setup-secondary mt-3 w-full" onClick={onBack} type="button">{t("differentEmail")}</button>
    <p className="auth-fine-print">{t("spamHint")}</p>
    <p className="auth-switch"><Link href="/sign-in" onClick={onBack}>{t("signIn")}</Link></p>
  </section>;
}
