import { expect, test } from "@playwright/test";

import { mockOnboarding } from "./onboarding-fixture";

test("welcome supports keyboard, deliberate swipes, reduced motion and large text", async ({ page }) => {
  await mockOnboarding(page, false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/welcome");
  await expect(page.locator(".welcome-splash")).toHaveCount(0);
  const panel = page.getByRole("region", { name: "Get to know Think Bee" });
  await panel.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: "Show panel 2" })).toHaveAttribute("aria-current", "step");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("button", { name: "Show panel 1" })).toHaveAttribute("aria-current", "step");
  await panel.dispatchEvent("touchstart", { touches: [{ identifier: 1, clientX: 250, clientY: 100 }] });
  await panel.dispatchEvent("touchend", { changedTouches: [{ identifier: 1, clientX: 180, clientY: 350 }] });
  await expect(page.getByRole("button", { name: "Show panel 1" })).toHaveAttribute("aria-current", "step");
  await panel.dispatchEvent("touchstart", { touches: [{ identifier: 1, clientX: 250, clientY: 100 }] });
  await panel.dispatchEvent("touchend", { changedTouches: [{ identifier: 1, clientX: 120, clientY: 110 }] });
  await expect(page.getByRole("button", { name: "Show panel 2" })).toHaveAttribute("aria-current", "step");
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Get started" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("entry screens use the correct transparent logos and accessible controls", async ({ page }, info) => {
  await mockOnboarding(page, false);
  for (const path of ["/welcome", "/register", "/sign-in"]) {
    await page.goto(path);
    await expect(page.locator(".welcome-splash")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const macaney = page.getByRole("link", { name: "Macaney", exact: true });
    if (path !== "/welcome" || info.project.name.startsWith("desktop")) {
      await expect(macaney).toHaveAttribute("href", "https://www.macaney.com/");
    }
    if (path !== "/welcome") {
      if (info.project.name.startsWith("mobile")) {
        await expect(page.locator(".auth-story")).toBeHidden();
        await expect(page.locator('.auth-layout img[src*="thinkbee-short"]:visible')).toHaveCount(0);
      } else {
        await expect(page.locator(".auth-story")).toBeVisible();
        await expect(page.locator(".auth-bee-desktop")).toBeVisible();
      }
      await expect(page.locator(".auth-wordmark")).toBeVisible();
    }
    for (const logo of await page.locator(".brand-mark img:visible").all()) {
      const forcedDark = await logo.evaluate((img) => img.parentElement?.dataset.surface === "dark");
      await expect(logo).toHaveAttribute("src", info.project.name.endsWith("dark") || forcedDark ? /-dark\.svg$/ : /(?:wordmark|short)\.svg$/);
      await expect(logo).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    }
    for (const button of await page.locator("button:visible").all()) {
      const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(48);
      expect(box?.width).toBeGreaterThanOrEqual(48);
    }
    await page.screenshot({ path: info.outputPath(`${path.slice(1)}-empty.png`), fullPage: true, animations: "disabled" });
  }
});

test("password recovery without a valid session offers a new link", async ({ page }) => {
  await mockOnboarding(page, false);
  await page.goto("/auth/reset-password");
  await expect(page.locator(".setup-feedback[role=alert]")).toContainText("This link has expired");
  await page.getByRole("link", { name: "Send reset link" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
});
