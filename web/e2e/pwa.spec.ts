import { expect, test } from "@playwright/test";

import { mockOnboarding } from "./onboarding-fixture";

test.beforeEach(async ({ page }) => {
  await mockOnboarding(page, true, true);
});

test("registers the service worker from Home without loading Me", async ({ page }) => {
  await page.route(/\/me(?:\?|$)/, (route) => route.abort());
  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
});

test("manifest, install prompt and supplied icons are wired", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("thinkbee-pwa-meaningful-use", "saved_scan"));
  await page.goto("/me");
  await expect(page.getByRole("radio", { name: "Light", exact: true })).toBeEnabled();
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect(await manifest.json()).toMatchObject({ name: "Think Bee", display: "standalone" });
  expect((await page.request.get("/icons/icon-192.png")).ok()).toBe(true);

  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "dismissed"; platform: string }>;
    };
    event.prompt = async () => undefined;
    event.userChoice = Promise.resolve({ outcome: "dismissed", platform: "web" });
    window.dispatchEvent(event);
  });
  await expect(page.getByRole("heading", { name: "Install Think Bee" })).toBeVisible();
  await page.getByRole("button", { name: "Install app" }).click();
  await expect(page.getByText("Installation was not started. You can try again here later.")).toBeVisible();
});

test("cached Home reloads offline", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await expect(page.getByRole("heading", { name: "Your farm dashboard" })).toBeVisible();
  // Chromium can reload a service-worker response with navigator.onLine still true.
  await page.addInitScript(() => Object.defineProperty(navigator, "onLine", { get: () => false }));
  await context.setOffline(true);
  const response = await page.reload();
  expect(response?.fromServiceWorker()).toBe(true);
  await expect(page.getByRole("heading", { name: "Your farm dashboard" })).toBeVisible();
});

test("handles install rejection with feedback and a fresh-event retry", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("thinkbee-pwa-meaningful-use", "saved_scan"));
  await page.goto("/me");
  await expect(page.getByRole("radio", { name: "Light", exact: true })).toBeEnabled();
  await page.evaluate(() => window.dispatchEvent(Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: async () => { throw new DOMException("Unavailable", "InvalidStateError"); },
    userChoice: Promise.resolve({ outcome: "dismissed", platform: "web" }),
  })));
  await page.getByRole("button", { name: "Install app" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Installation could not start" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload and try again" })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: async () => undefined,
    userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
  })));
  await page.getByRole("button", { name: "Install app" }).click();
  await expect(page.getByRole("heading", { name: "Install Think Bee" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("keeps optimized images offline without the browser HTTP cache", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.goto("/welcome");
  const photo = page.locator(".welcome-photo img");
  const slides = ["welcome-beekeeper", "welcome-leaf", "welcome-apiary"];
  for (const [index, filename] of slides.entries()) {
    await page.getByRole("button", { name: `Show panel ${index + 1}` }).click();
    await expect(photo).toHaveAttribute("src", new RegExp(`${filename}\\.webp`));
    await photo.evaluate((image: HTMLImageElement) => image.decode());
    await page.waitForFunction(async () => {
      const image = document.querySelector<HTMLImageElement>(".welcome-photo img");
      return Boolean(image?.currentSrc && await (await caches.open("thinkbee-images")).match(image.currentSrc));
    });
  }
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await context.setOffline(true);
  await page.reload();
  for (const [index, filename] of slides.entries()) {
    await page.getByRole("button", { name: `Show panel ${index + 1}` }).click();
    await expect(photo).toHaveAttribute("src", new RegExp(`${filename}\\.webp`));
    await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  }
});
