import { expect, test } from "@playwright/test";

import { localDraftCount, seedAppLock, storedLock, unlockApp } from "./app-lock-fixture";
import { mockOnboarding } from "./onboarding-fixture";

test("confirmed recovery keeps the lock on a sign-out failure, then clears private data on retry", async ({ page }) => {
  const state = await mockOnboarding(page, true, true);
  await seedAppLock(page);
  await page.goto("/setup/farm");
  await unlockApp(page);
  await page.getByLabel("Farm or apiary name").fill("Unsent farm");
  await expect(page.getByText("Draft saved on this device.")).toBeVisible();
  await page.goto("/me");
  state.logoutStatus = 503;
  await page.getByRole("button", { name: "Forgot PIN?" }).click();
  await expect(page.getByText(/Anything not yet synced will be lost/)).toBeVisible();
  await page.getByRole("button", { name: "Clear local data and sign out" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText("Your session could not be checked. Connect to the internet and try again.");
  await expect(page.locator("#app-content")).toBeHidden();
  expect(await storedLock(page)).not.toBeNull();
  state.logoutStatus = 204;
  await page.getByRole("button", { name: "Clear local data and sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  expect(await storedLock(page)).toBeNull();
  expect(await localDraftCount(page)).toBe(0);
  expect(await page.evaluate(() => Object.keys(localStorage).some((key) => /^sb-.*-auth-token$/.test(key)))).toBe(false);
});

test("recovery refuses to sign out or remove the lock when local cleanup fails", async ({ page }) => {
  const state = await mockOnboarding(page, true, true);
  await seedAppLock(page);
  await page.goto("/me");
  await page.evaluate(() => {
    const clear = IDBObjectStore.prototype.clear;
    IDBObjectStore.prototype.clear = function () {
      if (this.name === "setup") throw new DOMException("Blocked", "UnknownError");
      return clear.call(this);
    };
  });
  await page.getByRole("button", { name: "Forgot PIN?" }).click();
  await page.getByRole("button", { name: "Clear local data and sign out" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText("Lock settings could not be saved or read. Allow browser storage, then try again.");
  expect(state.logoutCount).toBe(0);
  expect(await storedLock(page)).not.toBeNull();
  await expect(page.locator("#app-content")).toBeHidden();
});

test("ordinary sign-out also removes the PIN after clearing local account data", async ({ page }) => {
  await mockOnboarding(page, true, true);
  await seedAppLock(page);
  await page.goto("/me");
  await unlockApp(page);
  await page.getByRole("button", { name: "Sign out on this device" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  expect(await storedLock(page)).toBeNull();
  expect(await localDraftCount(page)).toBe(0);
});
