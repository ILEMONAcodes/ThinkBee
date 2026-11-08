import { getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/ui/brand-mark";

import "@/styles/onboarding.css";

export default async function OfflinePage() {
  const t = await getTranslations("Pwa");
  return (
    <main className="offline-page">
      <div className="offline-card">
        <BrandMark kind="short" className="offline-mark" width={88} priority />
        <p className="setup-kicker">{t("offlineKicker")}</p>
        <h1 className="font-display">{t("offlineTitle")}</h1>
        <p className="text-subtle">{t("offlineBody")}</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Recover from the worker's cached document without an RSC request. */}
        <a className="setup-primary" href="/">{t("offlineAction")}</a>
      </div>
    </main>
  );
}
