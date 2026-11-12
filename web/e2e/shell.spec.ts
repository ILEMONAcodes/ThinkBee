import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("thinkbee-welcome-seen", "1"));
});

test("navigation, target sizes and empty Home", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A little care, every day");
  expect(await page.locator("h1").evaluate((heading) => getComputedStyle(heading).fontFamily)).toMatch(/fraunces/i);
  expect(await page.locator("body").evaluate((body) => getComputedStyle(body).fontFamily)).toMatch(/inter/i);
  const mobile = info.project.name.startsWith("mobile");
  const nav = page.locator(mobile ? ".mobile-navigation" : ".rail-destinations");
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link")).toHaveCount(5);
  for (const link of await nav.getByRole("link").all()) {
    const box = await link.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(48);
    expect(box?.height).toBeGreaterThanOrEqual(48);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("home.png"), fullPage: true, animations: "disabled" });
  await nav.getByRole("link", { name: "Records", exact: true }).click();
  await expect(page).toHaveURL(/\/records$/);
  await expect(nav.getByRole("link", { name: "Records", exact: true })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Me", exact: true }).click();
  await expect(page.getByRole("group", { name: "Appearance" })).toBeVisible();
  await nav.getByRole("link", { name: "Scan", exact: true }).click();
  await expect(page).toHaveURL(/\/scan$/);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");
  expect(errors).toEqual([]);
});

test("theme follows device changes and persists overrides", async ({ page }) => {
  await page.goto("/me");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("radio", { name: "Light", exact: true })).toBeChecked();
  await page.getByRole("radio", { name: "Follow device" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("offline shell and blocked preferences remain usable", async ({ page, context }) => {
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.setItem = () => { throw new Error("Storage unavailable"); };
    // Lock storage has its own fail-closed tests; appearance failures stay local.
    Storage.prototype.getItem = function (key) {
      if (key === "thinkbee-app-lock") return getItem.call(this, key);
      throw new Error("Storage unavailable");
    };
  });
  await page.goto("/me");
  await context.setOffline(true);
  await expect(page.getByText("You are offline. Some actions need a connection.")).toBeVisible();
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByText(/This preference could not be saved/)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("You are offline. Some actions need a connection.")).toHaveCount(0);
});

test("keyboard skip link, reduced motion and tablet rail", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.setViewportSize({ width: 834, height: 1112 });
  const home = page.locator(".rail-destinations").getByRole("link", { name: "Home", exact: true });
  await home.focus();
  await expect(page.locator(".desktop-rail")).toHaveCSS("width", "264px");
  await page.getByRole("button", { name: "Pin sidebar", exact: true }).click();
  await page.locator("h1").click();
  await expect(page.locator(".shell-main")).toHaveCSS("margin-left", "264px");
  await page.reload();
  await expect(page.getByRole("button", { name: "Unpin sidebar", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Unpin sidebar", exact: true }).click();
  await expect(page.locator(".shell-main")).toHaveCSS("margin-left", "88px");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("shell stays usable on a slow connection", async ({ page, context }) => {
  test.setTimeout(60_000);
  const session = await context.newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.emulateNetworkConditions", {
    offline: false, latency: 400, downloadThroughput: 62_500, uploadThroughput: 31_250,
  });
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto("/me");
  await expect(page.getByRole("radio", { name: "Dark", exact: true })).toBeEnabled();
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
