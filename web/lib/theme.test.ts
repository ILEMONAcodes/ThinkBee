import { runInNewContext } from "node:vm";

import { afterEach, describe, expect, it, vi } from "vitest";

import { usePreferences } from "@/lib/state/preferences";
import { parseTheme, resolveTheme, themeScript } from "@/lib/theme";

afterEach(() => {
  vi.unstubAllGlobals();
  usePreferences.setState({ theme: "system", railPinned: false, storageAvailable: true });
});

describe("theme preferences", () => {
  it("follows the device only in system mode", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(parseTheme("invalid")).toBe("system");
    expect(parseTheme(null)).toBe("system");
  });

  it.each(["dark", "light", "system", "invalid", null])("initializes before paint with %s saved", (saved) => {
    const document = { documentElement: { dataset: { theme: "" } } };
    runInNewContext(themeScript, {
      document, localStorage: { getItem: () => saved },
      window: { matchMedia: () => ({ matches: true }) },
    });
    expect(document.documentElement.dataset.theme).toBe(resolveTheme(parseTheme(saved), true));
  });

  it("keeps settings usable when storage is blocked", () => {
    vi.stubGlobal("localStorage", { setItem: () => { throw new Error("Blocked"); } });
    usePreferences.getState().setTheme("dark");
    usePreferences.getState().toggleRail();
    expect(usePreferences.getState()).toMatchObject({ theme: "dark", railPinned: true, storageAvailable: false });
    const document = { documentElement: { dataset: { theme: "" } } };
    runInNewContext(themeScript, {
      document, localStorage: { getItem: () => { throw new Error("Blocked"); } },
      window: { matchMedia: () => ({ matches: true }) },
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
