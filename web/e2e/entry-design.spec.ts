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
  const swipeTo = (clientX: number, clientY: number) => panel.evaluate((target, end) => {
    const start = new Touch({ identifier: 1, target, clientX: 250, clientY: 100 });
    const finish = new Touch({ identifier: 1, target, ...end });
    target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [start] }));
    target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [finish] }));
  }, { clientX, clientY });
  await swipeTo(180, 350);
  await expect(page.getByRole("button", { name: "Show panel 1" })).toHaveAttribute("aria-current", "step");
  await swipeTo(120, 110);
  await expect(page.getByRole("button", { name: "Show panel 2" })).toHaveAttribute("aria-current", "step");
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Next" }).press("Enter");
  await expect(page.getByRole("link", { name: "Get started" })).toBeFocused();
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
    await expect(page.locator(".theme-button")).toHaveCount(0);
    if (path !== "/welcome") {
      await expect(page.locator(".auth-wordmark")).toBeVisible();
      const photo = page.locator(".auth-hero > img");
      await expect(photo).toHaveAttribute("src", path === "/register" ? /brood-comb/ : /welcome-beekeeper/);
      await photo.evaluate((image: HTMLImageElement) => image.decode());
    } else {
      await expect(page.locator(".welcome-brand")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
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

test("signed-out visitors enter through Welcome or Sign in instead of the dashboard", async ({ page }) => {
  await mockOnboarding(page, false, false, false);
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome$/);
  await page.getByRole("link", { name: "Skip", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  for (const path of ["/", "/records", "/chats", "/me", "/scan?subject=hive"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.locator(".app-shell")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  }
});

test("an SDK session with a suspended account cannot open Home", async ({ page }) => {
  const account = await mockOnboarding(page, true, true);
  account.bootstrapStatus = 403;
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveCount(0);
});

test("a server-rejected session returns to Sign in", async ({ page }) => {
  const account = await mockOnboarding(page, true, true);
  account.bootstrapStatus = 401;
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveCount(0);
  expect(account.logoutCount).toBe(1);
});
