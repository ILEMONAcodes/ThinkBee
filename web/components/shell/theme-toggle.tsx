"use client";

import { CircleHalf } from "@phosphor-icons/react/dist/csr/CircleHalf";
import { useTranslations } from "next-intl";

import { usePreferences } from "@/lib/state/preferences";
import { themeOptions } from "@/lib/theme";

export function ThemeToggle({ compact = false }: Readonly<{ compact?: boolean }>) {
  const t = useTranslations("Theme");
  const theme = usePreferences((state) => state.theme);
  const hydrated = usePreferences((state) => state.hydrated);
  const setTheme = usePreferences((state) => state.setTheme);
  const next = themeOptions[(themeOptions.indexOf(theme) + 1) % themeOptions.length];
  return (
    <button
      aria-label={t("toggleLabel", { current: t(theme), next: t(next) })}
      className={compact ? "rail-control" : "theme-button"}
      disabled={!hydrated}
      onClick={() => setTheme(next)}
      title={t("current", { theme: t(theme) })}
      type="button"
    >
      <CircleHalf aria-hidden size={24} className="shrink-0" />
      {compact ? <span className="rail-label">{t("current", { theme: t(theme) })}</span> : null}
    </button>
  );
}
