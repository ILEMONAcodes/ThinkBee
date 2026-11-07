"use client";

import { ArrowSquareOut, DownloadSimple, ShareNetwork } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

import {
  getPwaState,
  getServerPwaState,
  promptPwaInstall,
  subscribePwa,
} from "@/lib/pwa/client";

export function InstallAppCard() {
  const t = useTranslations("Pwa");
  const pwa = useSyncExternalStore(subscribePwa, getPwaState, getServerPwaState);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [status, setStatus] = useState<"idle" | "prompting" | "accepted" | "dismissed" | "failed">("idle");

  if (pwa.installed || status === "accepted" || (!pwa.canInstall && status === "idle")) return null;

  async function install(): Promise<void> {
    if (status === "prompting") return;
    if (pwa.isIos) {
      setShowIosHelp(true);
      return;
    }
    setStatus("prompting");
    const outcome = await promptPwaInstall();
    setStatus(outcome === "unavailable" ? "failed" : outcome);
  }

  return (
    <section className="install-card" aria-labelledby="install-title">
      <div className="install-icon"><DownloadSimple aria-hidden size={28} weight="bold" /></div>
      <div>
        <p className="setup-kicker">{t("installKicker")}</p>
        <h2 className="font-display" id="install-title">{t("installTitle")}</h2>
        <p className="text-subtle">{t("installBody")}</p>
        {status === "dismissed" ? <p className="install-status" role="status">{t("installDismissed")}</p> : null}
        {status === "failed" ? <p className="install-status" role="alert">{t("installFailed")}</p> : null}
        {showIosHelp ? (
          <ol className="install-steps">
            <li><ShareNetwork aria-hidden size={22} />{t("iosShare")}</li>
            <li><ArrowSquareOut aria-hidden size={22} />{t("iosAdd")}</li>
          </ol>
        ) : null}
        {pwa.canInstall || status === "prompting" ? <button className="setup-primary mt-5" disabled={status === "prompting"} onClick={() => { void install(); }} type="button">
          {status === "prompting" ? t("installPending") : pwa.isIos ? t("iosAction") : t("installAction")}
        </button> : null}
        {status === "failed" && !pwa.canInstall ? <button className="setup-primary mt-5" onClick={() => window.location.reload()} type="button">
          {t("installRetry")}
        </button> : null}
      </div>
    </section>
  );
}
