"use client";

import { useEffect, type ReactNode } from "react";

import { usePreferences } from "@/lib/state/preferences";
import { parseTheme, railStorageKey, resolveTheme, themeStorageKey } from "@/lib/theme";

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  useEffect(() => {
    void import("@/lib/pwa/client");
    const media = matchMedia("(prefers-color-scheme: dark)");
    try {
      usePreferences.setState({
        theme: parseTheme(localStorage.getItem(themeStorageKey)),
        railPinned: localStorage.getItem(railStorageKey) === "pinned",
      });
    } catch {
      usePreferences.setState({ storageAvailable: false });
    }
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(usePreferences.getState().theme, media.matches);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === themeStorageKey || event.key === null) {
        usePreferences.setState({ theme: parseTheme(event.newValue) });
      }
      if (event.key === railStorageKey || event.key === null) {
        usePreferences.setState({ railPinned: event.newValue === "pinned" });
      }
    };
    apply();
    const unsubscribe = usePreferences.subscribe(apply);
    usePreferences.setState({ hydrated: true });
    media.onchange = apply;
    addEventListener("storage", onStorage);
    return () => {
      unsubscribe();
      media.onchange = null;
      removeEventListener("storage", onStorage);
    };
  }, []);
  return children;
}
