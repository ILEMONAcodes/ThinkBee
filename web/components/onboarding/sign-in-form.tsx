"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { useIdentity } from "@/components/auth/account-provider";
import { AuthError } from "@/components/onboarding/auth-error";
import { EmailField } from "@/components/onboarding/email-field";
import { PasswordField } from "@/components/onboarding/password-field";
import { VerificationNotice } from "@/components/onboarding/verification-notice";
import { RegistrationNotice } from "@/components/onboarding/registration-notice";
import { AppError } from "@/lib/api/errors";
import { resendVerification, signInWithPassword } from "@/lib/auth/actions";
import { signInSchema } from "@/lib/auth/forms";
import { requiresEmailConfirmation } from "@/lib/auth/policy";
import { useOnline } from "@/lib/hooks/use-online";

export function SignInForm() {
  const t = useTranslations("Setup");
  const router = useRouter();
  const identity = useIdentity();
  const online = useOnline();
  const [error, setError] = useState<unknown>();
  const [verification, setVerification] = useState<string>();
  const [resending, setResending] = useState(false);
  const { register, handleSubmit, getValues, resetField, formState: { errors, isSubmitting } } = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" },
  });
  useEffect(() => { if (identity.owner) router.replace("/auth/callback"); }, [identity.owner, router]);
  const submit = async ({ email, password }: z.infer<typeof signInSchema>) => {
    if (!online || !identity.ready) return;
    setError(undefined);
    try { await signInWithPassword(email, password); resetField("password"); router.replace("/auth/callback"); }
    catch (failure) { setError(failure); }
  };
  const resend = async () => {
    if (!online || resending) return;
    const email = getValues("email").trim();
    setResending(true);
    try { await resendVerification(email); resetField("password"); setVerification(email); }
    catch (failure) { setError(failure); }
    finally { setResending(false); }
  };
  if (verification) return <VerificationNotice email={verification} onBack={() => { setVerification(undefined); setError(undefined); }} />;
  return <section className="auth-form" aria-labelledby="auth-title">
    <p className="setup-kicker">{t("emailStep")}</p><h1 className="auth-title" id="auth-title">{t("signInTitle")}</h1>
    <p className="auth-description">{t("signInBody")}</p>
    <Suspense fallback={null}><RegistrationNotice /></Suspense>
    <form className="auth-fields" onSubmit={handleSubmit(submit)} noValidate aria-busy={isSubmitting}>
      <EmailField field={register("email")} invalid={!!errors.email} />
      <PasswordField field={register("password")} error={errors.password ? t("passwordRequired") : undefined} />
      <Link className="auth-forgot" href="/forgot-password">{t("forgotPassword")}</Link>
      {!online ? <p className="setup-feedback" role="status">{t("connectionRequired")}</p> : null}
      {error || identity.error ? <AuthError error={error || identity.error} /> : null}
      {requiresEmailConfirmation && error instanceof AppError && error.code === "email_not_confirmed" ? <button className="setup-secondary" type="button" disabled={!online || resending} onClick={() => void resend()}>{resending ? t("sending") : t("verifyAction")}</button> : null}
      <button className="setup-primary auth-submit" type="submit" disabled={!identity.ready || isSubmitting || !online}>{isSubmitting ? t("signingIn") : t("signIn")}<ArrowRight size={20} aria-hidden="true" /></button>
      <p className="auth-private-note">{t("privacyShort")} <Link href="/privacy">{t("privacyLink")}</Link></p>
    </form>
    <p className="auth-switch">{t("newAccount")} <Link href="/register">{t("register")}</Link></p>
  </section>;
}
