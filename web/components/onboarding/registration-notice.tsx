"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function RegistrationNotice() {
  const searchParams = useSearchParams();
  const t = useTranslations("Setup");
  return searchParams.get("registered") === "1"
    ? <p className="setup-feedback" role="status">{t("accountCreated")}</p> : null;
}
