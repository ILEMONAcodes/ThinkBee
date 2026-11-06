"use client";

import { Moon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

export function ThemeToggle({ compact = false }: Readonly<{ compact?: boolean }>) {
  const t = useTranslations("Theme");

  function toggleTheme() {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = root.dataset.theme ?? (systemDark ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem("thinkbee-theme", next);
  }

  return (
    <button
      aria-label={t("toggle")}
      className={`flex min-h-12 items-center rounded-pill text-muted hover:bg-nav-active hover:text-app ${compact ? "gap-4 px-4" : "justify-center px-3"}`}
      onClick={toggleTheme}
      type="button"
    >
      <Moon aria-hidden className="shrink-0" size={24} />
      {compact ? <span className="whitespace-nowrap text-sm font-semibold opacity-0 transition-opacity group-hover:opacity-100">{t("toggle")}</span> : null}
    </button>
  );
}
