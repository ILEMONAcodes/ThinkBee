"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthError } from "@/components/onboarding/auth-error";
import { EmailField } from "@/components/onboarding/email-field";
import { requestPasswordReset } from "@/lib/auth/actions";
import { emailSchema } from "@/lib/auth/forms";
import { useOnline } from "@/lib/hooks/use-online";

const schema = z.object({ email: emailSchema });
export function ForgotPasswordForm() {
  const t = useTranslations("Setup");
  const online = useOnline();
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<unknown>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  useEffect(() => {
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const submit = async ({ email }: z.infer<typeof schema>) => {
    if (!online || cooldown) return;
    setError(undefined);
    try { await requestPasswordReset(email); setSent(true); }
    catch (failure) { setError(failure); }
    finally { setCooldown(60); }
  };
  return <section className="auth-form">
    <p className="setup-kicker">{t("emailStep")}</p><h1 className="auth-title">{t("forgotTitle")}</h1>
    <p className="auth-description">{t("forgotBody")}</p>
    <form className="auth-fields" onSubmit={handleSubmit(submit)} noValidate>
      <EmailField field={register("email")} invalid={!!errors.email} />
      {sent ? <p className="setup-feedback" role="status">{t("resetSentBody")}</p> : null}
      {!online ? <p className="setup-feedback" role="status">{t("connectionRequired")}</p> : null}
      {error ? <AuthError error={error} /> : null}
      <button className="setup-primary" disabled={isSubmitting || !online || cooldown > 0} type="submit">{isSubmitting ? t("sending") : cooldown ? t("resendIn", { seconds: cooldown }) : t("resetLinkAction")}</button>
    </form>
    <p className="auth-switch"><Link href="/sign-in">{t("signIn")}</Link></p>
  </section>;
}
