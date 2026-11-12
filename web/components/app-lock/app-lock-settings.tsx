"use client";

import { LockKey } from "@phosphor-icons/react/dist/csr/LockKey";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { LockSettingsContent } from "@/components/app-lock/lock-settings-content";
import { useIdentity } from "@/components/auth/account-provider";
import { appLockConfig } from "@/lib/app-lock/policy";
import { initializeAppLock, useAppLock } from "@/lib/app-lock/state";
import { supportsAppLock } from "@/lib/app-lock/storage";

export function AppLockSettings() {
  const t = useTranslations("AppLock");
  const identity = useIdentity();
  const { status, record, epoch } = useAppLock();
  useEffect(initializeAppLock, []);
  if (identity.ready && !identity.owner) return null;
  return <section className="lock-settings" aria-labelledby="lock-settings-title">
    <div className="lock-settings-heading"><LockKey size={28} aria-hidden="true" /><h2 id="lock-settings-title" className="font-display text-3xl">{t("title")}</h2></div>
    <p className="mt-3 text-subtle">{t("description", { minutes: appLockConfig.idleMs / 60_000 })}</p>
    {!identity.ready || status === "checking" ? <p className="lock-notice" role="status">{t("loading")}</p>
      : !supportsAppLock() ? <p className="lock-notice" role="status">{t("unsupported")}</p>
      : identity.owner ? <LockSettingsContent key={`${identity.owner}:${epoch}`} owner={identity.owner} record={record} /> : null}
    <p className="lock-footnote">{t("deviceOnly")}</p>
  </section>;
}
