"use client";

import { create } from "zustand";

import { railStorageKey, themeStorageKey, type ThemePreference } from "@/lib/theme";

type Preferences = {
  hydrated: boolean;
  theme: ThemePreference;
  railPinned: boolean;
  storageAvailable: boolean;
  setTheme: (theme: ThemePreference) => void;
  toggleRail: () => void;
};

function save(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export const usePreferences = create<Preferences>((set, get) => ({
  hydrated: false,
  theme: "system",
  railPinned: false,
  storageAvailable: true,
  setTheme: (theme) => set({ theme, storageAvailable: save(themeStorageKey, theme) }),
  toggleRail: () => {
    const railPinned = !get().railPinned;
    set({ railPinned, storageAvailable: save(railStorageKey, railPinned ? "pinned" : "collapsed") });
  },
}));
