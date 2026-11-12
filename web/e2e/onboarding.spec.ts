import { expect, test } from "@playwright/test";

import { mockOnboarding } from "./onboarding-fixture";

const password = "Farm-test-password-2026!";
async function fillRegistration(page: import("@playwright/test").Page) {
  await page.getByLabel("Your name", { exact: true }).fill("Ada Okoro");
  await page.getByLabel("Email address").fill("farmer@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
}

test("registration returns to password sign-in without email or a persisted session", async ({ page }, info) => {
  const state = await mockOnboarding(page, false);
  await page.goto("/welcome");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A little help");
  await expect(page.locator(".welcome-splash")).toHaveCount(0);
  await page.locator(".welcome-photo-main img").evaluate((image: HTMLImageElement) => image.decode());
  await page.screenshot({ path: info.outputPath("welcome.png"), fullPage: true });
  await page.getByRole("button", { name: "Show panel 2" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your work deserves a record.");
  await page.getByRole("button", { name: "Show panel 3" }).click();
  await expect(page.getByRole("link", { name: "Skip for now" })).toBeVisible();
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  expect(state.signupCount).toBe(0);
  await fillRegistration(page);
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await page.getByLabel("Confirm password", { exact: true }).fill("not-the-same");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("The passwords do not match.")).toBeVisible();
  expect(state.signupCount).toBe(0);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.screenshot({ path: info.outputPath("register.png"), fullPage: true });
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in\?registered=1$/);
  await expect(page.locator(".setup-feedback[role=status]")).toContainText("Account created successfully.");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  expect(state.signupCount).toBe(1);
  expect(state.signupHasCodeChallenge).toBe(false);
  expect(state.resendCount).toBe(0);
  expect(state.bootstrapCount).toBe(0);
  expect(state.passwordCount).toBe(0);
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(stored).not.toContain("farmer@example.test");
  expect(stored).not.toContain(password);
  expect(stored).not.toContain("Ada Okoro");
  expect(stored).not.toContain("fake-refresh-for-browser-tests");
  await page.screenshot({ path: info.outputPath("account-created.png"), fullPage: true, animations: "disabled" });
  await page.getByLabel("Email address").fill("farmer@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/setup\/profile$/);
  await expect(page.getByLabel("Display name")).toHaveValue("Ada Okoro");
  expect(state.tokenCount).toBe(0);
  expect(state.passwordCount).toBe(1);
});

test("password sign-in handles invalid credentials, verification and successful login", async ({ page }, info) => {
  const state = await mockOnboarding(page, false, true);
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await expect(page.getByRole("button", { name: /Google|Facebook|Apple/ })).toHaveCount(0);
  await page.getByLabel("Email address").fill("farmer@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.screenshot({ path: info.outputPath("sign-in.png"), fullPage: true });
  state.signInError = "invalid_credentials";
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".setup-feedback[role=alert]")).toContainText("The email or password is incorrect");
  await expect(page.locator("body")).not.toContainText("Private provider information");
  state.signInError = "email_not_confirmed";
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".setup-feedback[role=alert]")).toContainText("Your account still needs activation.");
  await expect(page.getByRole("button", { name: "Send verification link", exact: true })).toHaveCount(0);
  expect(state.resendCount).toBe(0);
  state.signInError = "";
  await page.getByLabel("Email address").fill("farmer@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(state.passwordCount).toBe(3);
});

test("a recovery at the site root completes PKCE and expired links stay private", async ({ page }) => {
  const state = await mockOnboarding(page, false);
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill("farmer@example.test");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/a reset link is on its way/)).toBeVisible();
  await page.goto("/?code=root-callback-code");
  await expect(page).toHaveURL(/\/auth\/reset-password$/);
  expect(state.tokenCount).toBe(1);
  await page.goto("/auth/callback?error=access_denied&error_description=private-provider-details");
  await expect(page.locator(".setup-feedback[role=alert]")).toContainText("This link has expired");
  expect(page.url()).not.toContain("error");
  await expect(page.locator("body")).not.toContainText("private-provider-details");
});

test("does not promise password sign-in when Supabase still requires confirmation", async ({ page }) => {
  const state = await mockOnboarding(page, false);
  state.signupRequiresConfirmation = true;
  await page.goto("/register");
  await fillRegistration(page);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.locator(".setup-feedback[role=alert]")).toContainText("Your account still needs activation.");
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByText("Account created successfully.", { exact: false })).toHaveCount(0);
  expect(state.resendCount).toBe(0);
  expect(state.bootstrapCount).toBe(0);
});

test("password recovery exchanges its link and updates the password", async ({ page }) => {
  const state = await mockOnboarding(page, false);
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await page.getByLabel("Email address").fill("farmer@example.test");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/a reset link is on its way/)).toBeVisible();
  expect(state.recoverCount).toBe(1);
  await page.goto("/auth/callback?code=recovery-code");
  await expect(page).toHaveURL(/\/auth\/reset-password$/);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("heading", { name: "Your password is updated." })).toBeVisible();
  expect(state.passwordUpdates).toBe(1);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(password);
});

test("registration failures and offline password login remain recoverable", async ({ page, context }) => {
  const state = await mockOnboarding(page, false);
  state.signupStatus = 429;
  await page.goto("/register");
  await fillRegistration(page);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.locator(".setup-feedback[role=alert]")).toContainText("Too many attempts");
  await expect(page.getByRole("heading", { name: "Check your email" })).toHaveCount(0);
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  await context.setOffline(true);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
  await expect(page.getByText("Connect to the internet to sign in.")).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
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
