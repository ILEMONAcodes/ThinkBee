import { expect, test } from "@playwright/test";

import { mockOnboarding } from "./onboarding-fixture";

test("waits through a slow account startup instead of failing after fifteen seconds", async ({ page }) => {
  test.setTimeout(60_000);
  const state = await mockOnboarding(page, true);
  state.bootstrapDelayMs = 20_000;
  await page.goto("/auth/callback");
  await expect(page.getByRole("heading", { name: "Finishing your sign-in" })).toBeVisible();
  await expect(page.getByText(/Still connecting to your account/)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".setup-feedback[role=alert]")).toHaveCount(0);
  await expect(page).toHaveURL(/\/setup\/profile$/, { timeout: 30_000 });
  expect(state.bootstrapCount).toBe(1);
});

test("reports an unavailable account service and retries without another sign-in", async ({ page }, info) => {
  const state = await mockOnboarding(page, true);
  state.bootstrapStatus = 503;
  await page.goto("/auth/callback");
  await expect(page.locator(".setup-feedback[role=alert]")).toContainText("The account service is temporarily unavailable");
  await expect(page.locator("body")).not.toContainText("when you have a connection");
  await expect(page.locator("body")).not.toContainText("Internal details");
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  await page.screenshot({ path: info.outputPath("account-service-unavailable.png"), fullPage: true, animations: "disabled" });
  state.bootstrapStatus = 200;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page).toHaveURL(/\/setup\/profile$/);
  expect(state.passwordCount).toBe(0);
  expect(state.signupCount).toBe(0);
});
