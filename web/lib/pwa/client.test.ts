/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { PWA_MEANINGFUL_USE_KEY } from "@/lib/pwa/meaningful-use";

beforeEach(() => {
  localStorage.clear();
  delete (window as Window & { __thinkBeeInstallPrompt?: Event }).__thinkBeeInstallPrompt;
  vi.resetModules();
});

describe("PWA client", () => {
  it("waits for meaningful use before exposing the browser install prompt", async () => {
    const pwa = await import("@/lib/pwa/client");
    pwa.startPwaClient();
    const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "dismissed"; platform: string }>;
    };
    event.prompt = vi.fn(async () => undefined);
    event.userChoice = Promise.resolve({ outcome: "dismissed", platform: "web" });
    window.dispatchEvent(event);
    expect(pwa.getPwaState().canInstall).toBe(false);

    localStorage.setItem(PWA_MEANINGFUL_USE_KEY, "saved_scan");
    window.dispatchEvent(new Event("thinkbee:pwa-meaningful-use"));
    expect(pwa.getPwaState().canInstall).toBe(true);
    await expect(pwa.promptPwaInstall()).resolves.toBe("dismissed");
    expect(event.prompt).toHaveBeenCalledOnce();
  });

  it("recognises current and touch-capable iOS devices", async () => {
    const { matchesIosDevice } = await import("@/lib/pwa/client");
    expect(matchesIosDevice("Mozilla/5.0 (iPhone)", "iPhone", 5)).toBe(true);
    expect(matchesIosDevice("Mozilla/5.0 (Macintosh)", "MacIntel", 5)).toBe(true);
    expect(matchesIosDevice("Mozilla/5.0 (Macintosh)", "MacIntel", 0)).toBe(false);
  });

  it("consumes a prompt once while it is still pending", async () => {
    const pwa = await import("@/lib/pwa/client");
    let finish!: (choice: { outcome: "dismissed"; platform: string }) => void;
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: vi.fn(async () => undefined),
      userChoice: new Promise<{ outcome: "dismissed"; platform: string }>((resolve) => { finish = resolve; }),
    });
    window.dispatchEvent(event);
    const pending = pwa.promptPwaInstall();
    await expect(pwa.promptPwaInstall()).resolves.toBe("unavailable");
    finish({ outcome: "dismissed", platform: "web" });
    await expect(pending).resolves.toBe("dismissed");
    expect(event.prompt).toHaveBeenCalledOnce();
  });

  it("handles rejection and lets a fresh browser event retry", async () => {
    localStorage.setItem(PWA_MEANINGFUL_USE_KEY, "saved_scan");
    const pwa = await import("@/lib/pwa/client");
    window.dispatchEvent(Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: async () => { throw new DOMException("Already used", "InvalidStateError"); },
      userChoice: Promise.resolve({ outcome: "dismissed", platform: "web" }),
    }));
    await expect(pwa.promptPwaInstall()).resolves.toBe("failed");
    expect(pwa.getPwaState().canInstall).toBe(false);
    window.dispatchEvent(Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: async () => undefined,
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    }));
    expect(pwa.getPwaState().canInstall).toBe(true);
    await expect(pwa.promptPwaInstall()).resolves.toBe("accepted");
  });

  it("uses an install prompt captured before the PWA runtime loads", async () => {
    localStorage.setItem(PWA_MEANINGFUL_USE_KEY, "sent_message");
    const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted"; platform: string }>;
    };
    event.prompt = vi.fn(async () => undefined);
    event.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
    (window as Window & { __thinkBeeInstallPrompt?: Event }).__thinkBeeInstallPrompt = event;

    const pwa = await import("@/lib/pwa/client");
    pwa.startPwaClient();
    expect(pwa.getPwaState().canInstall).toBe(true);
    await expect(pwa.promptPwaInstall()).resolves.toBe("accepted");
    expect(event.prompt).toHaveBeenCalledOnce();
  });
});
