"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { useIdentity } from "@/components/auth/account-provider";
import { AuthError } from "@/components/onboarding/auth-error";
import { PasswordField } from "@/components/onboarding/password-field";
import { updatePassword } from "@/lib/auth/actions";
import { resetPasswordSchema } from "@/lib/auth/forms";
import { useOnline } from "@/lib/hooks/use-online";

export function ResetPasswordForm() {
  const t = useTranslations("Setup");
  const identity = useIdentity();
  const online = useOnline();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirmPassword: "" } });
  const submit = async ({ password }: z.infer<typeof resetPasswordSchema>) => {
    if (!online || !identity.owner) return;
    setError(undefined);
    try { await updatePassword(password); reset(); setSaved(true); }
    catch (failure) { setError(failure); }
  };
  if (!identity.ready) return <p className="auth-form" role="status">{t("loading")}</p>;
  if (!identity.owner) return <section className="auth-form"><h1 className="auth-title">{t("resetTitle")}</h1><p className="setup-feedback" role="alert">{t("errors.expired")}</p><Link href="/forgot-password" className="setup-primary mt-6">{t("resetLinkAction")}</Link></section>;
  if (saved) return <section className="auth-form"><h1 className="auth-title">{t("resetSuccess")}</h1><p className="auth-description">{t("resetSuccessBody")}</p><Link href="/auth/callback" className="setup-primary mt-8">{t("home")}</Link></section>;
  return <section className="auth-form">
    <p className="setup-kicker">{t("emailStep")}</p><h1 className="auth-title">{t("resetTitle")}</h1><p className="auth-description">{t("resetBody")}</p>
    <form className="auth-fields" onSubmit={handleSubmit(submit)} noValidate>
      <PasswordField field={register("password")} creating error={errors.password ? t("passwordInvalid") : undefined} />
      <PasswordField field={register("confirmPassword")} creating confirmation error={errors.confirmPassword ? t("passwordMismatch") : undefined} />
      {!online ? <p className="setup-feedback" role="status">{t("connectionRequired")}</p> : null}
      {error ? <AuthError error={error} /> : null}
      <button className="setup-primary" disabled={isSubmitting || !online} type="submit">{isSubmitting ? t("resetSaving") : t("resetAction")}</button>
    </form>
  </section>;
}
