"use client";

import { useEffect, type ReactNode } from "react";

import { startThemeClient } from "@/lib/theme-client";

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  useEffect(() => {
    void import("@/lib/pwa/client");
    // Appearance must remain usable if the connection drops after the page loads.
    return startThemeClient();
  }, []);
  return children;
}
