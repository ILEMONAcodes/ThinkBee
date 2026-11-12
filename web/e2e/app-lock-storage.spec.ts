import { expect, test } from "@playwright/test";

import { lockKey, seedAppLock, storedLock, testPin, unlockApp } from "./app-lock-fixture";
import { mockOnboarding } from "./onboarding-fixture";

test.beforeEach(async ({ page }) => { await mockOnboarding(page, true, true); });

test("shares retry delays across tabs and reloads without sharing an unlock", async ({ page, context }) => {
  test.setTimeout(60_000);
  await seedAppLock(page);
  await page.goto("/me");
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.getByLabel("PIN", { exact: true }).fill("987654");
    await page.getByRole("button", { name: "Unlock", exact: true }).click();
    await expect(page.getByLabel("PIN", { exact: true })).toHaveValue("");
    await expect.poll(async () => (await storedLock(page))?.failures).toBe(attempt + 1);
  }
  const other = await context.newPage();
  await other.goto("/me");
  await other.getByLabel("PIN", { exact: true }).fill("987654");
  await other.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(other.getByText("Too many incorrect attempts. Wait before trying your PIN again.")).toBeVisible();
  const retryAt = (await storedLock(other))!.retryAt;
  await page.reload();
  expect((await storedLock(page))?.retryAt).toBe(retryAt);
  await expect(page.getByRole("button", { name: "Unlock", exact: true })).toBeDisabled();
  await page.clock.install();
  await page.clock.fastForward(31_000);
  await unlockApp(page);
  await expect(other.getByRole("dialog")).toBeVisible();
  expect((await storedLock(other))?.failures).toBe(0);
  await other.close();
});

test("enabling a PIN covers another tab that was already open", async ({ page, context }) => {
  await page.goto("/me");
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByRole("heading", { name: "A little care, every day" })).toBeVisible();
  await page.bringToFront();
  await page.getByRole("button", { name: "Set up a PIN" }).click();
  await page.getByLabel("New PIN", { exact: true }).fill(testPin);
  await page.getByLabel("Confirm PIN", { exact: true }).fill(testPin);
  await page.getByRole("button", { name: "Save PIN", exact: true }).click();
  await expect(other.locator("#app-content")).toBeHidden();
  await expect(other.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Lock now" }).click();
  await other.bringToFront();
  await unlockApp(other);
  await expect(page.getByRole("dialog")).toBeVisible();
  await other.close();
});

test("an unreadable lock fails closed and can retry once browser storage works", async ({ page }) => {
  await seedAppLock(page);
  await page.addInitScript(() => {
    const read = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (this === localStorage && key === "thinkbee-app-lock" && read.call(sessionStorage, "block-lock") === "1") throw new Error("Blocked");
      return read.call(this, key);
    };
  });
  await page.goto("/me");
  await unlockApp(page);
  await page.evaluate(() => sessionStorage.setItem("block-lock", "1"));
  await page.reload();
  await expect(page.getByText(/We could not read this browser’s lock settings/)).toBeVisible();
  await expect(page.locator("#app-content")).toBeHidden();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator("#app-content")).toBeHidden();
  await page.evaluate(() => sessionStorage.removeItem("block-lock"));
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await unlockApp(page);
});

test("corrupt lock settings do not reveal the app or silently remove the lock", async ({ page }) => {
  await seedAppLock(page);
  await page.goto("/me");
  await page.evaluate((key) => localStorage.setItem(key, "{damaged"), lockKey);
  await page.reload();
  await expect(page.getByText(/We could not read this browser’s lock settings/)).toBeVisible();
  await expect(page.locator("#app-content")).toBeHidden();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), lockKey)).toBe("{damaged");
  await expect(page.getByRole("button", { name: "Forgot PIN?" })).toBeVisible();
});
