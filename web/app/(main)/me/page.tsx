import { getTranslations } from "next-intl/server";

import { ThemeSettings } from "@/components/shell/theme-settings";
import { AccountPanel } from "@/components/auth/account-panel";
import { InstallAppCard } from "@/components/pwa/install-app-card";

import "@/styles/onboarding.css";

export default async function MePage() {
  const t = await getTranslations("Feature");
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="font-display text-4xl">{t("meTitle")}</h1>
        <p className="mt-3 max-w-xl text-subtle">{t("meBody")}</p>
      </header>
      <AccountPanel />
      <InstallAppCard />
      <ThemeSettings />
    </div>
  );
}
