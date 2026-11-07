"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { SetupError } from "@/components/onboarding/feedback";
import { useIdentity } from "@/components/auth/account-provider";
import { sendSignInLink } from "@/lib/auth/actions";
import { callbackUrl, getSupabase, oauthProviders } from "@/lib/auth/client";
import { useOnline } from "@/lib/hooks/use-online";
import { signInSchema } from "@/lib/onboarding/forms";

const cooldownSeconds = 60;
export function SignInForm() {
  const t = useTranslations("Setup");
  const router = useRouter();
  const identity = useIdentity();
  const online = useOnline();
  const [sent, setSent] = useState<string>();
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors }, control } = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema), defaultValues: { email: "", adult: false },
  });
  const adult = useWatch({ control, name: "adult" });
  useEffect(() => {
    if (identity.owner) router.replace("/auth/callback");
  }, [identity.owner, router]);
  useEffect(() => {
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const send = async (email: string) => {
    if (!online || busy || cooldown > 0) return;
    setError(undefined); setBusy(true);
    try { await sendSignInLink(email.trim()); setSent(email.trim()); setCooldown(cooldownSeconds); }
    catch (failure) { setError(failure); setCooldown(cooldownSeconds); }
    finally { setBusy(false); }
  };
  if (sent) return <section className="setup-narrow">
    <p className="setup-kicker">{t("emailStep")}</p><h1 className="setup-title">{t("checkEmail")}</h1>
    <p className="mt-5 text-lg">{t("sentTo")} <strong className="break-all">{sent}</strong></p>
    <p className="mt-4 text-subtle">{t("sameDevice")}</p>
    {!online ? <p className="setup-feedback" role="status">{t("connectionRequired")}</p> : null}
    {error ? <SetupError error={error} /> : null}
    <button className="setup-primary mt-8 w-full" disabled={busy || cooldown > 0 || !online} onClick={() => void send(sent)} type="button">{busy ? t("sending") : cooldown ? t("resendIn", { seconds: cooldown }) : t("resend")}</button>
    <button className="setup-secondary mt-3 w-full" onClick={() => { setSent(undefined); setError(undefined); }} type="button">{t("differentEmail")}</button>
    <p className="mt-6 text-sm text-subtle">{t("spamHint")}</p>
  </section>;
  return <section className="setup-narrow">
    <p className="setup-kicker">{t("emailStep")}</p><h1 className="setup-title">{t("signInTitle")}</h1>
    <p className="mt-5 text-lg text-subtle">{t("signInBody")}</p>
    <form className="mt-8 space-y-5" onSubmit={handleSubmit(({ email }) => send(email))} noValidate>
      <div><label className="setup-label" htmlFor="email">{t("email")}</label>
        <input {...register("email")} autoComplete="email" autoCapitalize="none" spellCheck={false} className="setup-input" id="email" type="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
        {errors.email ? <p className="setup-field-error" id="email-error">{t("emailInvalid")}</p> : null}
      </div>
      <label className="setup-checkbox"><input {...register("adult")} type="checkbox" aria-invalid={!!errors.adult} aria-describedby={errors.adult ? "adult-error" : undefined} /><span>{t("adult")}</span></label>
      {errors.adult ? <p className="setup-field-error" id="adult-error">{t("adultRequired")}</p> : null}
      <p className="text-sm text-subtle">{t("privacyShort")} <Link className="underline text-link" href="/privacy">{t("privacyLink")}</Link></p>
      {!online ? <p role="status">{t("connectionRequired")}</p> : null}
      {error || identity.error ? <SetupError error={error || identity.error} /> : null}
      <button className="setup-primary w-full" type="submit" disabled={!identity.ready || busy || !online || cooldown > 0}>{busy ? t("sending") : cooldown ? t("resendIn", { seconds: cooldown }) : t("emailAction")}</button>
    </form>
    {oauthProviders.map((provider) => <button className="setup-secondary mt-3 w-full" disabled={!adult || !online || busy} key={provider} type="button" onClick={async () => {
      setBusy(true);
      try {
        const { error: failure } = await getSupabase().auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl() } });
        if (failure) throw failure;
      } catch (failure) { setError(failure); setBusy(false); }
    }}>{t("google")}</button>)}
    <Link className="setup-secondary mt-4 w-full" href="/welcome">{t("back")}</Link>
  </section>;
}
