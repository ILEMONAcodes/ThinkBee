import { expect, test } from "@playwright/test";

import { mockOnboarding } from "./onboarding-fixture";

test.use({ serviceWorkers: "block" });

const password = "Farm-test-password-2026!";
async function fillRegistration(page: import("@playwright/test").Page) {
  await page.getByLabel("Your name", { exact: true }).fill("Ada Okoro");
  await page.getByLabel("Email address").fill("farmer@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
}

test("welcome shows all three photos and opens registration", async ({ page }, info) => {
  await mockOnboarding(page, false);
  await page.goto("/welcome");
  await expect(page.locator(".welcome-splash")).toHaveCount(0);
  const slides = [
    ["Spot problems early", "welcome-beekeeper"],
    ["Keep a simple record", "welcome-leaf"],
    ["Grow together", "welcome-apiary"],
  ];
  for (const [index, [title, filename]] of slides.entries()) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    const photo = page.locator(".welcome-photo img");
    await expect(photo).toHaveAttribute("src", new RegExp(`${filename}\\.webp`));
    await photo.evaluate((image: HTMLImageElement) => image.decode());
    await expect(page.locator('.welcome-brand img[src$="thinkbee-wordmark-dark.svg"]')).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${filename}.png`), fullPage: true, animations: "disabled" });
    if (index < slides.length - 1) await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByRole("link", { name: "Skip" })).toBeVisible();
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/register$/);
});

test("registration returns to password sign-in without email or a persisted session", async ({ page }, info) => {
  const state = await mockOnboarding(page, false);
  await page.goto("/register");
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
  await expect(page.getByRole("heading", { name: "Your farm dashboard" })).toBeVisible();
  expect(state.passwordCount).toBe(3);
});

test("sign-out removes unsynced setup drafts from this device", async ({ page }) => {
  await mockOnboarding(page, true, true);
  await page.goto("/setup/farm");
  await page.getByLabel("Farm or apiary name").fill("Draft to keep");
  await expect(page.getByText("Draft saved on this device.")).toBeVisible();
  await page.goto("/me");
  await page.getByRole("button", { name: "Sign out on this device" }).click();
  await expect(page.getByText("Signing out removes unsynced setup drafts from this device.")).toBeVisible();
  await page.getByRole("button", { name: "Discard drafts and sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
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