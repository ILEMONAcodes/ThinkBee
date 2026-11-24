import { expect, test } from "@playwright/test";

import { mockOnboarding } from "./onboarding-fixture";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("thinkbee-welcome-seen", "1"));
});

test("navigation, target sizes and empty Home", async ({ page }, info) => {
  await mockOnboarding(page, true, true);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your farm dashboard");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 2 }).first()).toHaveText("Check today");
  const community = main.getByRole("region", { name: "Community Chat" });
  await expect(community).toHaveCSS("background-color", "rgb(252, 153, 0)");
  const communityLink = community.getByRole("link", { name: "Join Conversations", exact: true });
  await expect(communityLink).toHaveAttribute("href", "/chats");
  await expect(main.getByRole("link", { name: "Records and reminders" })).toHaveAttribute("href", "/records");
  await expect(main.getByRole("link", { name: /Inspect your hive frames/ })).toHaveAttribute("href", "/scan?subject=hive");
  const crops = main.getByRole("link", { name: "Crops", exact: true });
  await expect(crops).toHaveAttribute("href", "/scan?subject=crop");
  await expect(main.getByRole("link", { name: "View Records" })).toHaveAttribute("href", "/records");
  await expect(main.getByRole("heading", { name: "Quick Actions" })).toBeVisible();
  await expect(main.getByRole("link", { name: "Preview a Health Check" })).toHaveAttribute("href", "/scan");
  await expect(main.getByRole("link", { name: "Farm History & Logbook" })).toHaveAttribute("href", "/records");
  await expect(main.getByRole("link", { name: "Community & Peer Advice" })).toHaveAttribute("href", "/chats");
  await expect(main.getByRole("heading", { name: "Activity & History" })).toBeVisible();
  await expect(main.getByRole("link", { name: "Open Logbook" })).toHaveAttribute("href", "/records");
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
  await crops.click();
  await expect(page.getByRole("heading", { name: "Check a Crop" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inspect a Hive" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Add crop photos" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Crop type" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Analyse", exact: true })).toBeDisabled();
  await page.screenshot({ path: info.outputPath("scan-crop-upload.png"), fullPage: true, animations: "disabled" });
  const [picker] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Upload", exact: true }).click(),
  ]);
  await picker.setFiles("public/photos/glossy-leaves.webp");
  await page.getByRole("combobox", { name: "Crop type" }).selectOption("cassava");
  await expect(page.getByRole("button", { name: "Analyse", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("link", { name: "Back", exact: true }).click();
  const search = main.getByRole("searchbox", { name: "Search photo-check topics" });
  await search.fill("brood");
  await search.press("Enter");
  await expect(page.getByRole("heading", { name: "Photo-check topics" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inspect a Hive" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Check a Crop" })).toHaveCount(0);
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await nav.getByRole("link", { name: "Records", exact: true }).click();
  await expect(page).toHaveURL(/\/records$/);
  await expect(page.getByRole("heading", { name: "Records and reminders" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Preview a hive scan" })).toHaveAttribute("href", "/scan?subject=hive");
  await page.screenshot({ path: info.outputPath("records.png"), animations: "disabled" });
  await expect(nav.getByRole("link", { name: "Records", exact: true })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Me", exact: true }).click();
  await expect(page.getByRole("group", { name: "Appearance" })).toBeVisible();
  await nav.getByRole("link", { name: "Scan", exact: true }).click();
  await expect(page).toHaveURL(/\/scan$/);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Scan for Early Signs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inspect a Hive" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Check a Crop" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Inspect a Hive/ })).toHaveAttribute("href", "/scan?subject=hive");
  await page.screenshot({ path: info.outputPath("scan.png"), fullPage: true, animations: "disabled" });
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");
  expect(errors).toEqual([]);
});

test("Home and Me show the signed-in farmer and saved farm", async ({ page }, info) => {
  const account = await mockOnboarding(page, true, true);
  const id = crypto.randomUUID();
  const timestamp = "2026-11-07T00:00:00Z";
  account.farms.set(id, {
    id,
    client_id: id,
    name: "North Field & Apiary",
    kind: "both",
    created_at: timestamp,
    updated_at: timestamp,
  });
  await page.goto("/");
  await expect(page.getByText("Hello, Ada")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "North Field & Apiary" })).toBeVisible();
  const nav = page.locator(info.project.name.startsWith("mobile") ? ".mobile-navigation" : ".rail-destinations");
  await nav.getByRole("link", { name: "Me", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ada", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "My farms" }).getByText("North Field & Apiary")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out on this device" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Set up a PIN" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("me.png"), fullPage: true, animations: "disabled" });
});

test("theme follows device changes and persists overrides", async ({ page }) => {
  await mockOnboarding(page, true, true);
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
  await mockOnboarding(page, true, true);
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "thinkbee-theme") throw new Error("Storage unavailable");
      setItem.call(this, key, value);
    };
    Storage.prototype.getItem = function (key) {
      if (key === "thinkbee-theme") throw new Error("Storage unavailable");
      return getItem.call(this, key);
    };
  });
  await page.goto("/me");
  await expect(page.getByRole("radio", { name: "Dark", exact: true })).toBeEnabled();
  await context.setOffline(true);
  await expect(page.getByText("You are offline. Some actions need a connection.")).toBeVisible();
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByText(/This preference could not be saved/)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("You are offline. Some actions need a connection.")).toHaveCount(0);
});

test("keyboard skip link, reduced motion and tablet rail", async ({ page }) => {
  await mockOnboarding(page, true, true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeAttached();
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
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
  await mockOnboarding(page, true, true);
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

test("scan follow-ups open the branded assistant and return to the result", async ({ page }, info) => {
  await mockOnboarding(page, true, true);
  await page.goto("/scan?scanId=example&chat=true");
  await expect(page.getByRole("heading", { name: "Think Bee AI" })).toBeVisible();
  await expect(page.getByRole("log", { name: "Assistant conversation" })).toBeVisible();
  await expect(page.getByPlaceholder("Ask a follow-up…")).toBeVisible();
  await page.screenshot({ path: info.outputPath("scan-assistant.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Back to result" }).click();
  await expect(page).toHaveURL(/\/scan\?scanId=example$/);
});

test("hive and crop upload covers use a soft crop and fit the viewport", async ({ page }, info) => {
  await mockOnboarding(page, true, true);
  for (const subject of ["hive", "crop"] as const) {
    await page.goto(`/scan?subject=${subject}`);
    const hero = page.locator(".scan-upload-hero");
    const photo = hero.locator("img");
    const picker = page.getByRole("heading", { name: `Add ${subject} photos` });
    await expect(photo).toHaveCSS("filter", "blur(2.5px)");
    await photo.evaluate((element: HTMLImageElement) => element.decode());
    const heroBox = await hero.boundingBox();
    const pickerBox = await picker.boundingBox();
    expect(heroBox).not.toBeNull();
    expect(pickerBox).not.toBeNull();
    if (info.project.name.startsWith("desktop")) {
      expect(pickerBox!.x).toBeGreaterThan(heroBox!.x + heroBox!.width);
    } else {
      expect(pickerBox!.y).toBeGreaterThan(heroBox!.y + heroBox!.height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    await expect(page.getByRole("button", { name: "Analyse", exact: true })).toBeDisabled();
    await page.screenshot({ path: info.outputPath(`scan-${subject}.png`), fullPage: true, animations: "disabled" });
  }
});
