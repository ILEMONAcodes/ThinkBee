"use client";

import { PushPin } from "@phosphor-icons/react/dist/csr/PushPin";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { NavigationLinks } from "@/components/shell/navigation-links";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { usePreferences } from "@/lib/state/preferences";

export function DesktopRail() {
  const t = useTranslations("Navigation");
  const pinned = usePreferences((state) => state.railPinned);
  const toggleRail = usePreferences((state) => state.toggleRail);
  return (
    <aside className="desktop-rail" data-pinned={pinned} aria-label={t("sidebar")}>
      <Link aria-label={t("brandHome")} className="rail-brand" href="/">
        <Image alt="" className="rail-logo" height={192} priority src="/icons/icon-192.png" width={192} />
        <span className="rail-label font-display text-2xl">{t("brandName")}</span>
      </Link>
      <nav aria-label={t("primary")} className="rail-destinations"><NavigationLinks variant="desktop" /></nav>
      <div className="rail-footer">
        <ThemeToggle compact />
        <button aria-label={pinned ? t("unpin") : t("pin")} aria-pressed={pinned} className="rail-control" onClick={toggleRail} title={pinned ? t("unpin") : t("pin")} type="button">
          <PushPin aria-hidden size={24} className="shrink-0" weight={pinned ? "fill" : "regular"} />
          <span className="rail-label">{pinned ? t("unpin") : t("pin")}</span>
        </button>
      </div>
    </aside>
  );
}
