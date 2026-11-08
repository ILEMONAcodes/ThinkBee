import { useTranslations } from "next-intl";

import { AppError } from "@/lib/api/errors";

export function AuthError({ error }: Readonly<{ error: unknown }>) {
  const t = useTranslations("Setup");
  const key = error instanceof AppError
    ? error.code === "email_not_confirmed" ? "verificationNeeded"
      : error.code === "invalid_credentials" ? "credentialsInvalid"
      : error.code === "weak_password" ? "passwordWeak"
      : error.status === 429 ? "authLimited"
      : error.status === 400 || error.status === 422 ? "registrationFailed"
      : "authUnavailable"
    : "authUnavailable";
  return <p className="setup-feedback" role="alert">{t(key)}</p>;
}
