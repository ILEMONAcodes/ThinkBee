"use client";

import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { EyeSlash } from "@phosphor-icons/react/dist/csr/EyeSlash";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { appLockConfig } from "@/lib/app-lock/policy";

export function PinField({ field, label, error, autoFocus = false }: Readonly<{
  field: UseFormRegisterReturn; label: string; error?: string; autoFocus?: boolean;
}>) {
  const t = useTranslations("AppLock");
  const [visible, setVisible] = useState(false);
  const id = useId();
  return <div>
    <label className="lock-label" htmlFor={id}>{label}</label>
    <div className="lock-pin-field">
      <input {...field} id={id} className="lock-input" type={visible ? "text" : "password"} inputMode="numeric" autoComplete="off" autoFocus={autoFocus} maxLength={appLockConfig.pinDigits} spellCheck={false} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
      <button className="lock-pin-toggle" type="button" aria-label={t(visible ? "hidePin" : "showPin", { field: label })} aria-pressed={visible} onClick={() => setVisible(!visible)}>
        {visible ? <EyeSlash size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
      </button>
    </div>
    {error ? <p className="lock-error" id={`${id}-error`}>{error}</p> : null}
  </div>;
}
