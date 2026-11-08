import { EnvelopeSimple } from "@phosphor-icons/react/dist/csr/EnvelopeSimple";
import { useTranslations } from "next-intl";
import type { UseFormRegisterReturn } from "react-hook-form";

export function EmailField({ field, invalid }: Readonly<{ field: UseFormRegisterReturn; invalid: boolean }>) {
  const t = useTranslations("Setup");
  return <div>
    <label className="setup-label" htmlFor={field.name}>{t("email")}</label>
    <div className="auth-email-field"><EnvelopeSimple size={22} aria-hidden="true" />
      <input {...field} autoComplete="email" autoCapitalize="none" spellCheck={false} className="setup-input" id={field.name} type="email" placeholder={t("emailPlaceholder")} aria-invalid={invalid} aria-describedby={invalid ? `${field.name}-error` : undefined} />
    </div>
    {invalid ? <p className="setup-field-error" id={`${field.name}-error`}>{t("emailInvalid")}</p> : null}
  </div>;
}
