import { expect, test } from "@playwright/test";

import { mockOnboarding } from "./onboarding-fixture";

test.use({ serviceWorkers: "block" });

test.beforeEach(async ({ page }) => { await mockOnboarding(page, true, true); });

test("appearance works offline after account startup", async ({ page, context }) => {
  await page.goto("/me");
  const light = page.getByRole("radio", { name: "Light", exact: true });
  await expect(light).toBeEnabled();
  await page.route("**/_next/static/**/*.js", (route) => route.abort("internetdisconnected"));
  await context.setOffline(true);
  await light.check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
