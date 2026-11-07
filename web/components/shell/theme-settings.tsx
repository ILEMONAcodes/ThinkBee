"use client";

import { useTranslations } from "next-intl";

import { usePreferences } from "@/lib/state/preferences";
import { themeOptions } from "@/lib/theme";

export function ThemeSettings() {
  const t = useTranslations("Theme");
  const theme = usePreferences((state) => state.theme);
  const setTheme = usePreferences((state) => state.setTheme);
  const storageAvailable = usePreferences((state) => state.storageAvailable);
  return (
    <fieldset className="rounded-lg border border-line bg-raised p-6 sm:p-8">
      <legend className="sr-only">{t("title")}</legend>
      <h2 className="font-display text-2xl" aria-hidden>{t("title")}</h2>
      <p className="mt-2 text-subtle">{t("description")}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {themeOptions.map((option) => (
          <label className="theme-option" key={option}>
            <input checked={theme === option} name="theme" onChange={() => setTheme(option)} type="radio" value={option} />
            <span>{t(option)}</span>
          </label>
        ))}
      </div>
      {!storageAvailable ? <p role="status" className="mt-4 text-sm text-subtle">{t("temporary")}</p> : null}
    </fieldset>
  );
}
