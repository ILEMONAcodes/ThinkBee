"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { errorKey } from "@/lib/api/errors";

export function SetupError({ error, retry }: Readonly<{ error: unknown; retry?: () => void }>) {
  const t = useTranslations("Setup");
  const key = errorKey(error);
  return <div className="setup-feedback" role="alert">
    <p>{t(`errors.${key}`)}</p>
    {retry ? <button className="setup-secondary mt-3" onClick={retry} type="button">{t("retry")}</button> : null}
    {key === "session" || key === "expired" ? <Link className="setup-secondary mt-3" href="/sign-in">{t("signIn")}</Link> : null}
  </div>;
}
