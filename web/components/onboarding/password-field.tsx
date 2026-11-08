"use client";

import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { EyeSlash } from "@phosphor-icons/react/dist/csr/EyeSlash";
import { LockSimple } from "@phosphor-icons/react/dist/csr/LockSimple";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

export function PasswordField({ field, confirmation = false, creating = false, error }: Readonly<{
  field: UseFormRegisterReturn;
  confirmation?: boolean;
  creating?: boolean;
  error?: string;
}>) {
  const t = useTranslations("Setup");
  const [visible, setVisible] = useState(false);
  const id = field.name;
  const label = confirmation ? "confirmPassword" : "password";
  const toggle = confirmation ? visible ? "hideConfirmPassword" : "showConfirmPassword" : visible ? "hidePassword" : "showPassword";
  return <div>
    <label className="setup-label" htmlFor={id}>{t(label)}</label>
    <div className="auth-password-field">
      <LockSimple size={22} aria-hidden="true" />
      <input {...field} id={id} type={visible ? "text" : "password"} autoComplete={creating ? "new-password" : "current-password"} autoCapitalize="none" spellCheck={false} className="setup-input" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : creating && !confirmation ? `${id}-hint` : undefined} />
      <button className="auth-password-toggle" type="button" aria-label={t(toggle)} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeSlash size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}</button>
    </div>
    {error ? <p className="setup-field-error" id={`${id}-error`}>{error}</p> : creating && !confirmation ? <p className="auth-password-hint" id={`${id}-hint`}>{t("passwordHint")}</p> : null}
  </div>;
}
