import { expect, test } from "@playwright/test";

import { seedAppLock, storedLock, testPin, unlockApp } from "./app-lock-fixture";
import { mockOnboarding } from "./onboarding-fixture";

// WebAuthn RP IDs must be hostnames; IP literals are not valid relying parties.
test.use({ baseURL: "http://localhost:3100" });

test("enrolls a platform authenticator, verifies it offline and rejects invalid assertions", async ({ page, context }) => {
  test.setTimeout(60_000);
  await mockOnboarding(page, true, true);
  await seedAppLock(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", { options: {
    protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true,
    isUserVerified: true, automaticPresenceSimulation: true,
  } });
  await page.goto("/me");
  await unlockApp(page);
  const settings = page.getByRole("region", { name: "App lock", exact: true });
  await settings.getByRole("button", { name: "Set up device unlock" }).click();
  await settings.getByLabel("Current PIN", { exact: true }).fill(testPin);
  await settings.getByRole("button", { name: "Continue on device" }).click();
  await expect(settings.getByText("Device unlock is on. You can also use your PIN.")).toBeVisible();
  expect((await storedLock(page))?.device?.publicKey).toBeTruthy();
  await settings.getByRole("button", { name: "Lock now" }).click();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Use device unlock" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await context.setOffline(false);
  await settings.getByRole("button", { name: "Lock now" }).click();
  for (const override of [{ isBadUV: true }, { isBadUP: true }, { isBogusSignature: true }]) {
    await cdp.send("WebAuthn.setResponseOverrideBits", { authenticatorId, ...override });
    await page.getByRole("button", { name: "Use device unlock" }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("#app-content")).toBeHidden();
    await expect(page.getByRole("button", { name: "Use device unlock" })).toBeEnabled();
  }
  await cdp.send("WebAuthn.setResponseOverrideBits", { authenticatorId });
  await page.evaluate(() => { navigator.credentials.get = async () => { throw new DOMException("Cancelled", "NotAllowedError"); }; });
  await page.getByRole("button", { name: "Use device unlock" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText("Device unlock was cancelled. Try again or use your PIN.");
  await unlockApp(page);
  await settings.getByRole("button", { name: "Remove device unlock" }).click();
  await settings.getByLabel("Current PIN", { exact: true }).fill(testPin);
  await settings.getByRole("button", { name: "Remove device unlock" }).click();
  await expect(settings.getByRole("button", { name: "Set up device unlock" })).toBeVisible();
  expect((await storedLock(page))?.device).toBeUndefined();
});

test("offers the PIN when platform verification is unavailable", async ({ page }) => {
  await mockOnboarding(page, true, true);
  await seedAppLock(page);
  await page.addInitScript(() => { PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = async () => false; });
  await page.goto("/me");
  await unlockApp(page);
  await expect(page.getByText("Device unlock is not available in this browser. You can use your PIN.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Set up device unlock" })).toHaveCount(0);
  await page.getByRole("button", { name: "Lock now" }).click();
  await expect(page.getByRole("button", { name: "Use device unlock" })).toHaveCount(0);
  await unlockApp(page);
});
