"use client";

import { useTranslations } from "next-intl";

import { useAccount } from "@/lib/hooks/use-account";
import { useOnline } from "@/lib/hooks/use-online";
import { syncSetup } from "@/lib/onboarding/sync";

export function SetupProgress() {
  const t = useTranslations("Setup");
  const { owner, draft } = useAccount();
  const online = useOnline();
  const pending = !!(draft?.profileJob || draft?.farmJob);
  const knownError = draft?.syncError;
  return <div className="setup-feedback" role="status">
    <p>{pending ? t(online ? "syncing" : "queued") : t("synced")}</p>
    {pending && knownError ? <><p className="mt-3">{t(`errors.${knownError}`)}</p><button className="setup-secondary mt-3" disabled={!online} type="button" onClick={() => { if (owner) void syncSetup(owner).catch(() => undefined); }}>{t("retry")}</button></> : null}
  </div>;
}
