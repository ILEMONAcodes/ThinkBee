"use client";

import { useTranslations } from "next-intl";

import { DesktopRail } from "@/components/shell/desktop-rail";
import { NavigationLinks } from "@/components/shell/navigation-links";

export function AppNavigation() {
  const t = useTranslations("Navigation");
  return (
    <>
      <DesktopRail />
      <nav aria-label={t("primary")} className="mobile-navigation">
        <NavigationLinks variant="mobile" />
      </nav>
    </>
  );
}
