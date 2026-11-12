import { expect, test } from "@playwright/test";

import { backgroundApp, lockKey, seedAppLock, storedLock, testPin, unlockApp } from "./app-lock-fixture";
import { mockOnboarding } from "./onboarding-fixture";

test.beforeEach(async ({ page }) => { await mockOnboarding(page, true, true); });

test("sets a confirmed PIN, hides private content, traps focus and returns to settings", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/me");
  const settings = page.getByRole("region", { name: "App lock", exact: true });
  await settings.getByRole("button", { name: "Set up a PIN" }).click();
  await settings.getByLabel("New PIN", { exact: true }).fill(testPin);
  await settings.getByLabel("Confirm PIN", { exact: true }).fill("123456");
  await settings.getByRole("button", { name: "Save PIN", exact: true }).click();
  await expect(settings.getByText("Enter the same PIN in both fields.")).toBeVisible();
  expect(await storedLock(page)).toBeNull();
  await settings.getByLabel("Confirm PIN", { exact: true }).fill(testPin);
  await settings.getByRole("button", { name: "Save PIN", exact: true }).click();
  await expect(settings.getByText("App lock is on.")).toBeVisible();
  expect((await storedLock(page))?.pin.salt).toHaveLength(43);
  expect(JSON.stringify(await storedLock(page))).not.toContain(testPin);
  await page.screenshot({ path: info.outputPath("app-lock-settings.png"), fullPage: true, animations: "disabled" });
  await settings.getByRole("button", { name: "Lock now" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#app-content")).toBeHidden();
  expect(await page.locator("#app-content").evaluate((element) => element instanceof HTMLElement && element.inert)).toBe(true);
  await expect(dialog.getByLabel("PIN", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  for (let step = 0; step < 6; step++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  for (const button of await dialog.getByRole("button").all()) {
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(48);
    expect(box?.width).toBeGreaterThanOrEqual(48);
  }
  await dialog.getByLabel("PIN", { exact: true }).fill("987654");
  await dialog.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("That PIN is not right. Try again.");
  await expect(dialog.getByLabel("PIN", { exact: true })).toHaveValue("");
  await page.screenshot({ path: info.outputPath("app-locked.png"), animations: "disabled" });
  await unlockApp(page);
  await expect(settings.getByRole("button", { name: "Lock now" })).toBeFocused();
  expect(errors).toEqual([]);
});

test("keeps a farm draft through background locking and cancelled recovery, including offline unlock", async ({ page, context }) => {
  await seedAppLock(page);
  await page.goto("/setup/farm");
  await unlockApp(page);
  await page.getByLabel("Farm or apiary name").fill("Draft to keep while locked");
  await expect(page.getByText("Draft saved on this device.")).toBeVisible();
  await backgroundApp(page);
  await context.setOffline(true);
  await expect(page.getByText("You’re offline. Your PIN still works.")).toBeVisible();
  await page.getByRole("button", { name: "Forgot PIN?" }).click();
  await expect(page.getByRole("heading", { name: "Reset this browser’s lock?" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Clear local data and sign out" })).toBeDisabled();
  await page.getByRole("button", { name: "Keep my data" }).click();
  await unlockApp(page);
  await expect(page.getByLabel("Farm or apiary name")).toHaveValue("Draft to keep while locked");
  await context.setOffline(false);
});

test("cached Home reloads covered and can be unlocked offline", async ({ page, context }) => {
  await seedAppLock(page);
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await unlockApp(page);
  await context.setOffline(true);
  const response = await page.reload();
  expect(response?.fromServiceWorker()).toBe(true);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#app-content")).toBeHidden();
  await unlockApp(page);
  await expect(page.getByRole("heading", { name: "A little care, every day" })).toBeVisible();
});

test("requires the current PIN to change or turn off the lock", async ({ page }) => {
  test.setTimeout(60_000);
  await seedAppLock(page);
  await page.goto("/me");
  await unlockApp(page);
  const settings = page.getByRole("region", { name: "App lock", exact: true });
  await settings.getByRole("button", { name: "Change PIN", exact: true }).click();
  await settings.getByLabel("Current PIN", { exact: true }).fill("654321");
  await settings.getByLabel("New PIN", { exact: true }).fill("987654");
  await settings.getByLabel("Confirm PIN", { exact: true }).fill("987654");
  await settings.getByRole("button", { name: "Save new PIN" }).click();
  await expect(settings.getByRole("alert")).toHaveText("That PIN is not right. Try again.");
  await settings.getByLabel("Current PIN", { exact: true }).fill(testPin);
  await settings.getByLabel("New PIN", { exact: true }).fill("987654");
  await settings.getByLabel("Confirm PIN", { exact: true }).fill("987654");
  await settings.getByRole("button", { name: "Save new PIN" }).click();
  await settings.getByRole("button", { name: "Lock now" }).click();
  await page.getByLabel("PIN", { exact: true }).fill(testPin);
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText("That PIN is not right. Try again.");
  await unlockApp(page, "987654");
  await settings.getByRole("button", { name: "Turn off app lock", exact: true }).click();
  await settings.getByLabel("Current PIN", { exact: true }).fill(testPin);
  await settings.getByRole("button", { name: "Turn off app lock", exact: true }).click();
  await expect(settings.getByRole("alert")).toHaveText("That PIN is not right. Try again.");
  expect(await storedLock(page)).not.toBeNull();
  await settings.getByLabel("Current PIN", { exact: true }).fill("987654");
  await settings.getByRole("button", { name: "Turn off app lock", exact: true }).click();
  await expect(settings.getByText("App lock is off.")).toBeVisible();
  await page.reload();
  await expect(settings.getByText("App lock is off.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("locks on idle expiry and a restored page", async ({ page }) => {
  await seedAppLock(page);
  await page.goto("/me");
  await unlockApp(page);
  await page.clock.install();
  await page.clock.fastForward("04:00");
  await page.getByRole("heading", { name: "App lock", exact: true }).click();
  await page.clock.fastForward("04:00");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.clock.fastForward("01:01");
  await expect(page.getByRole("dialog")).toBeVisible();
  await unlockApp(page);
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("keeps PIN unlock usable on a slow connection with large text and reduced motion", async ({ page, context }, info) => {
  test.setTimeout(60_000);
  await seedAppLock(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 62_500, uploadThroughput: 31_250 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/me");
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 30_000 });
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  expect(await page.getByRole("dialog").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("app-lock-large-text.png"), animations: "disabled" });
  await unlockApp(page);
});

test.describe("before startup", () => {
  test.use({ serviceWorkers: "block" });
  test("detects a lock enabled while startup scripts were still downloading", async ({ page }) => {
    let resume!: () => void;
    const ready = new Promise<void>((resolve) => { resume = resolve; });
    await page.route("**/_next/static/**/*.js", async (route) => { await ready; await route.continue(); });
    try {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const record = await seedAppLock(page);
      await page.evaluate(({ key, record }) => localStorage.setItem(key, JSON.stringify(record)), { key: lockKey, record });
      resume();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.locator("#app-content")).toBeHidden();
      await unlockApp(page);
    } finally { resume(); }
  });

  test("conceals app content even when the client runtime cannot load", async ({ page }) => {
    await seedAppLock(page);
    await page.route("**/_next/static/**/*.js", (route) => route.abort());
    await page.goto("/me");
    await expect(page.locator("#app-content")).toHaveCSS("visibility", "hidden");
    await expect(page.locator("#app-lock-cover")).toBeVisible();
    await expect(page.locator("#app-lock-cover").getByRole("link", { name: "Reload", exact: true })).toBeVisible();
    await page.unroute("**/_next/static/**/*.js");
    await page.reload();
    await unlockApp(page);
  });
});
