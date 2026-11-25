import { pbkdf2Sync } from "node:crypto";
import { expect, type Page } from "@playwright/test";

import type { LockRecord } from "../lib/app-lock/storage";

export const lockKey = "thinkbee-app-lock";
export const testPin = "012345";
const salt = Buffer.alloc(32, 7);
const verifier = { salt: salt.toString("base64url"), hash: pbkdf2Sync(testPin, salt, 600_000, 32, "sha256").toString("base64url"), iterations: 600_000 };

export async function seedAppLock(page: Page) {
  const record: LockRecord = { format: 1, id: crypto.randomUUID(), ownerId: "11111111-1111-4111-8111-111111111111", pin: verifier, failures: 0, retryAt: 0 };
  // Use page.addInitScript since the page already exists (context.addInitScript only runs for NEW pages)
  // The initScript runs on every navigation (including reloads). We only want to seed the lock
  // on the FIRST navigation of the test. If the user turns off the lock and reloads, we must NOT
  // re-seed it. Track this with a sessionStorage flag.
  await page.addInitScript(({ key, record }) => {
    console.log("[seedAppLock initScript] START, key:", key);
    // Only seed once per test session (survives reloads via sessionStorage)
    if (sessionStorage.getItem("thinkbee-test-lock-seeded") === "1") {
      console.log("[seedAppLock initScript] already seeded this session, skipping");
      console.log("[seedAppLock initScript] END");
      return;
    }
    // Check if the app's lock already exists in localStorage
    const existingLock = localStorage.getItem(key);
    if (existingLock !== null) {
      console.log("[seedAppLock initScript] app lock already present in localStorage, keeping existing");
    } else {
      // No lock in localStorage - seed it for the first time
      localStorage.setItem(key, JSON.stringify(record));
      console.log("[seedAppLock initScript] lock seeded:", localStorage.getItem(key)?.substring(0, 50));
    }
    // Mark as seeded for this test session
    sessionStorage.setItem("thinkbee-test-lock-seeded", "1");
    console.log("[seedAppLock initScript] END");
  }, { key: lockKey, record });
  return record;
}

export async function storedLock(page: Page): Promise<LockRecord | null> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), lockKey);
}

export async function unlockApp(page: Page, pin = testPin) {
  const dialog = page.getByRole("dialog", { name: "Think Bee is locked" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("PIN", { exact: true }).fill(pin);
  await dialog.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#app-content")).toBeVisible();
}

export async function backgroundApp(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    Reflect.deleteProperty(document, "visibilityState");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("dialog", { name: "Think Bee is locked" })).toBeVisible();
}

export async function localDraftCount(page: Page) {
  return page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open("thinkbee-onboarding");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const count = request.result.transaction("setup").objectStore("setup").count();
      count.onsuccess = () => { request.result.close(); resolve(count.result); };
      count.onerror = () => reject(count.error);
    };
  }));
}
