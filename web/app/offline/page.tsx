import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import "@/styles/onboarding.css";

export default async function OfflinePage() {
  const t = await getTranslations("Pwa");
  return (
    <main className="offline-page">
      <div className="offline-card">
        <Image alt="" className="offline-mark" height={112} priority src="/brand/thinkbee-short.svg" width={112} />
        <p className="setup-kicker">{t("offlineKicker")}</p>
        <h1 className="font-display">{t("offlineTitle")}</h1>
        <p className="text-subtle">{t("offlineBody")}</p>
        <Link className="setup-primary" href="/">{t("offlineAction")}</Link>
      </div>
    </main>
  );
}
