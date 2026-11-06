export const themeOptions = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof themeOptions)[number];
export const themeStorageKey = "thinkbee-theme";
export const railStorageKey = "thinkbee-rail";

export function parseTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): "light" | "dark" {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

// Static, before-paint initialization; never interpolate user content into this script.
export const themeScript = `(() => {
  let preference = "system";
  try {
    const saved = localStorage.getItem("thinkbee-theme");
    if (saved === "light" || saved === "dark") preference = saved;
  } catch (_) {}
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = preference === "system" ? (dark ? "dark" : "light") : preference;
})();`;
