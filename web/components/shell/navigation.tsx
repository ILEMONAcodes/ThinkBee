"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { DesktopRail } from "@/components/shell/desktop-rail";
import { NavigationLinks } from "@/components/shell/navigation-links";

export function AppNavigation({ railBrand }: Readonly<{ railBrand: ReactNode }>) {
  const t = useTranslations("Navigation");
  return (
    <>
      <DesktopRail brand={railBrand} />
      <nav aria-label={t("primary")} className="mobile-navigation">
        <NavigationLinks variant="mobile" />
      </nav>
    </>
  );
}
