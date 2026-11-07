import { expect, test } from "@playwright/test";

import { mockOnboarding } from "./onboarding-fixture";

test("welcome panels and email validation, cooldown and privacy", async ({ page }, info) => {
  const state = await mockOnboarding(page, false);
  await page.goto("/welcome");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A little help");
  await page.getByRole("button", { name: "Show panel 2" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your work deserves a record.");
  await page.getByRole("button", { name: "Show panel 3" }).click();
  await expect(page.getByRole("link", { name: "Skip for now" })).toBeVisible();
  await page.locator(".welcome-photo img").evaluate((image: HTMLImageElement) => image.decode());
  await page.screenshot({ path: info.outputPath("welcome.png"), fullPage: true });
  await page.getByRole("link", { name: "Get started" }).click();
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  expect(state.otpCount).toBe(0);
  await page.getByLabel("Email address").fill("farmer@example.test");
  await page.getByRole("checkbox").check();
  await page.screenshot({ path: info.outputPath("sign-in.png"), fullPage: true });
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Send again in/ })).toBeDisabled();
  expect(state.otpCount).toBe(1);
  expect(page.url()).not.toContain("farmer");
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(stored).not.toContain("farmer@example.test");
});

test("callback exchanges once and removes credentials from the URL", async ({ page }) => {
  const state = await mockOnboarding(page, false);
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("farmer@example.test");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.goto("/auth/callback?code=synthetic-code");
  await expect(page).toHaveURL(/\/setup\/profile$/);
  await expect(page.getByRole("heading", { name: "What should we call you?" })).toBeVisible();
  expect(state.tokenCount).toBe(1);
  await page.goto("/auth/callback?error=access_denied&error_description=private-provider-details");
  await expect(page.locator(".setup-feedback[role=alert]")).toContainText("This link has expired");
  expect(page.url()).not.toContain("error");
  await expect(page.locator("body")).not.toContainText("private-provider-details");
});

test("a callback at the configured site root still completes PKCE", async ({ page }) => {
  const state = await mockOnboarding(page, false);
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("farmer@example.test");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.goto("/?code=root-callback-code");
  await expect(page).toHaveURL(/\/setup\/profile$/);
  expect(state.tokenCount).toBe(1);
});

test("profile and farm sync, including a lost unit response", async ({ page }, info) => {
  const state = await mockOnboarding(page);
  await page.goto("/setup/profile");
  await page.getByLabel("Display name").fill("Ada Okoro");
  await page.getByLabel("A little about you (optional)").fill("I grow cassava and keep bees.");
  await expect(page.getByRole("heading", { name: "Ada Okoro" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("profile.png"), fullPage: true });
  await page.getByRole("button", { name: "Save profile and continue" }).click();
  await expect(page).toHaveURL(/\/setup\/farm$/);
  await page.getByLabel("Farm or apiary name").fill("North farm");
  await page.getByLabel("State (optional)", { exact: true }).fill("Oyo");
  await page.getByLabel("LGA (optional)").fill("Ibadan North");
  await page.getByLabel("Number of hives").fill("2");
  await page.getByLabel("Hive type (optional)").fill("Top bar");
  await page.getByLabel("Crops (optional)", { exact: true }).fill("Cassava");
  await page.screenshot({ path: info.outputPath("farm.png"), fullPage: true });
  state.failUnitOnce = true;
  await page.getByRole("button", { name: "Save my farm" }).click();
  await expect(page.getByText(/We could not reach the service/)).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Your submitted details are synced to your account.")).toBeVisible();
  expect(state.farms.size).toBe(1);
  expect(state.units.size).toBe(3);
  expect(state.profile?.display_name).toBe("Ada Okoro");
  expect(state.profile?.area_state).toBeNull();
  expect([...state.farms.values()][0].lat).toBeUndefined();
  await page.getByRole("link", { name: "Go to Home" }).click();
  await page.goto("/me");
  await expect(page.getByText("North farm", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out on this device" }).click();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByText("Ada Okoro")).toHaveCount(0);
});

test("offline setup is durable across reload and syncs on reconnect", async ({ page, context }) => {
  const state = await mockOnboarding(page, true, true);
  await page.goto("/setup/farm");
  await page.getByLabel("Farm or apiary name").fill("Offline farm");
  await expect(page.getByText("Draft saved on this device.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Farm or apiary name")).toHaveValue("Offline farm");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Save my farm" }).click();
  await expect(page.getByText(/Your details will sync when you have a connection/)).toBeVisible();
  expect(state.farms.size).toBe(0);
  await context.setOffline(false);
  await expect(page.getByText("Your submitted details are synced to your account.")).toBeVisible();
  expect(state.farms.size).toBe(1);
});

test("account failures and denied local storage do not report success", async ({ page }) => {
  const state = await mockOnboarding(page);
  state.bootstrapStatus = 503;
  await page.goto("/setup/profile");
  await expect(page.locator(".setup-feedback[role=alert]")).toContainText("We could not reach the service");
  await expect(page.locator("body")).not.toContainText("Internal details");
  state.bootstrapStatus = 200;
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByLabel("Display name").fill("Ada");
  await page.addInitScript(() => { IDBFactory.prototype.open = () => { throw new DOMException("Blocked", "SecurityError"); }; });
  await page.reload();
  await page.getByLabel("Display name").fill("Ada");
  await page.getByRole("button", { name: "Save profile and continue" }).click();
  await expect(page.locator(".setup-feedback[role=alert]")).toContainText("We could not save on this device");
  expect(state.profileWrites).toBe(0);
});
