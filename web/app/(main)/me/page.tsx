import { getTranslations } from "next-intl/server";

import { ThemeSettings } from "@/components/shell/theme-settings";
import { AccountPanel } from "@/components/auth/account-panel";
import { InstallAppCard } from "@/components/pwa/install-app-card";
import { PhotoBackdrop } from "@/components/ui/photo-backdrop";

import "@/styles/onboarding.css";

export default async function MePage() {
  const t = await getTranslations("Feature");
  return (
    <div className="mx-auto max-w-4xl">
      <header className="relative isolate mb-6 flex min-h-56 flex-col justify-end overflow-hidden rounded-xl bg-brand p-5 text-on-brand sm:min-h-64 sm:p-8">
        <PhotoBackdrop src="/photos/forest-foliage.webp" sizes="(min-width: 1024px) 896px, calc(100vw - 40px)" />
        <h1 className="font-display text-3xl leading-tight text-balance sm:text-5xl">{t("meTitle")}</h1>
        <p className="mt-3 max-w-xl text-on-brand/90">{t("meBody")}</p>
      </header>
      <AccountPanel />
      <InstallAppCard />
      <ThemeSettings />
    </div>
  );
}
