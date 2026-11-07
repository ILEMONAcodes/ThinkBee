import { expect, test } from "@playwright/test";

import { mockOnboarding } from "./onboarding-fixture";

test("sign-out asks before discarding an unsent farm draft", async ({ page }) => {
  await mockOnboarding(page, true, true);
  await page.goto("/setup/farm");
  await page.getByLabel("Farm or apiary name").fill("Draft to keep");
  await expect(page.getByText("Draft saved on this device.")).toBeVisible();
  await page.goto("/me");
  await page.getByRole("button", { name: "Sign out on this device" }).click();
  await expect(page.getByText("Signing out removes unsynced setup drafts from this device.")).toBeVisible();
  await page.getByRole("button", { name: "Keep my drafts" }).click();
  await page.goto("/setup/farm");
  await expect(page.getByLabel("Farm or apiary name")).toHaveValue("Draft to keep");
  await page.goto("/me");
  await page.getByRole("button", { name: "Sign out on this device" }).click();
  await page.getByRole("button", { name: "Discard drafts and sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  const count = await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open("thinkbee-onboarding");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const count = request.result.transaction("setup").objectStore("setup").count();
      count.onsuccess = () => { request.result.close(); resolve(count.result); };
      count.onerror = () => reject(count.error);
    };
  }));
  expect(count).toBe(0);
});
