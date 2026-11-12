"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { useIdentity } from "@/components/auth/account-provider";
import { AuthError } from "@/components/onboarding/auth-error";
import { EmailField } from "@/components/onboarding/email-field";
import { PasswordField } from "@/components/onboarding/password-field";
import { VerificationNotice } from "@/components/onboarding/verification-notice";
import { registerAccount } from "@/lib/auth/actions";
import { registerSchema } from "@/lib/auth/forms";
import { requiresEmailConfirmation } from "@/lib/auth/policy";
import { useOnline } from "@/lib/hooks/use-online";

export function RegisterForm() {
  const t = useTranslations("Setup");
  const router = useRouter();
  const identity = useIdentity();
  const online = useOnline();
  const [sent, setSent] = useState<string>();
  const [error, setError] = useState<unknown>();
  const { register, handleSubmit, resetField, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "", confirmPassword: "", adult: false },
  });
  useEffect(() => { if (identity.owner) router.replace("/auth/callback"); }, [identity.owner, router]);
  const submit = async ({ name, email, password }: z.infer<typeof registerSchema>) => {
    if (!online || !identity.ready) return;
    setError(undefined);
    try {
      await registerAccount(name, email, password);
      resetField("password"); resetField("confirmPassword");
      if (requiresEmailConfirmation) setSent(email);
      else router.replace("/sign-in?registered=1");
    } catch (failure) { setError(failure); }
  };
  if (sent) return <VerificationNotice email={sent} onBack={() => setSent(undefined)} />;
  return <section className="auth-form auth-form-register" aria-labelledby="auth-title">
    <p className="setup-kicker">{t("registerStep")}</p><h1 className="auth-title" id="auth-title">{t("registerTitle")}</h1>
    <p className="auth-description">{t("registerBody")}</p>
    <form className="auth-fields" onSubmit={handleSubmit(submit)} noValidate aria-busy={isSubmitting}>
      <div className="auth-field-pair">
      <div><label className="setup-label" htmlFor="name">{t("fullName")}</label><input {...register("name")} id="name" className="setup-input" autoComplete="name" placeholder={t("fullNamePlaceholder")} maxLength={80} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />{errors.name ? <p className="setup-field-error" id="name-error">{t("nameInvalid")}</p> : null}</div>
      <EmailField field={register("email")} invalid={!!errors.email} />
      </div>
      <div className="auth-field-pair">
      <PasswordField field={register("password")} creating error={errors.password ? t("passwordInvalid") : undefined} />
      <PasswordField field={register("confirmPassword")} creating confirmation error={errors.confirmPassword ? t("passwordMismatch") : undefined} />
      </div>
      <label className="setup-checkbox"><input {...register("adult")} type="checkbox" aria-invalid={!!errors.adult} aria-describedby={errors.adult ? "adult-error" : undefined} /><span>{t("adult")}</span></label>
      {errors.adult ? <p className="setup-field-error" id="adult-error">{t("adultRequired")}</p> : null}
      {!online ? <p className="setup-feedback" role="status">{t("connectionRequired")}</p> : null}
      {error || identity.error ? <AuthError error={error || identity.error} /> : null}
      <button className="setup-primary auth-submit" type="submit" disabled={!identity.ready || isSubmitting || !online}>{isSubmitting ? t("registering") : t("registerAction")}<ArrowRight size={20} aria-hidden="true" /></button>
      <p className="auth-private-note">{t("privacyShort")} <Link href="/privacy">{t("privacyLink")}</Link></p>
    </form>
    <p className="auth-switch">{t("hasAccount")} <Link href="/sign-in">{t("signIn")}</Link></p>
  </section>;
}
