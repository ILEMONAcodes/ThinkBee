import { expect, test } from "@playwright/test";

import { mockOnboarding, user } from "./onboarding-fixture";

test.use({ serviceWorkers: "block" });

test.beforeEach(async ({ page }) => {
  const members = new Set<string>();
  const messages = new Map<string, Array<{ id: string; body: string; user_id: string; created_at: string }>>();
  // Register chat routes BEFORE onboarding fixture so they take priority over the catch-all
  await page.context().route("**/api/v1/chat/spaces/**", async (route) => {
    const request = route.request();
    const parts = new URL(request.url()).pathname.split("/");
    const space = parts[5];
    const action = parts[6];
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (!request.headers().authorization?.startsWith("Bearer ")) return route.fulfill({ status: 401, headers });
    if (space === "public") return route.fulfill({
      headers, json: { spaces: [
        { id: "beekeepers", name: "Beekeepers", description: "Hives and honey", kind: "community", visibility: "public", avatar_key: "/photos/brood-comb.webp", cover: "/photos/brood-comb.webp", is_system: true, member_count: 0, creator_id: null, created_at: "2026-11-07T00:00:00Z", updated_at: "2026-11-07T00:00:00Z" },
        { id: "farmers", name: "General Farmers", description: "Crops and fieldwork", kind: "community", visibility: "public", avatar_key: "/photos/olive-foliage.webp", cover: "/photos/olive-foliage.webp", is_system: true, member_count: 0, creator_id: null, created_at: "2026-11-07T00:00:00Z", updated_at: "2026-11-07T00:00:00Z" },
      ] },
    });
    const membership = { state: "active", role: "member", created_at: new Date().toISOString() };
    if (action === "me") return route.fulfill({ headers, contentType: "application/json", body: JSON.stringify(members.has(space) ? membership : null) });
    if (action === "join") {
      members.add(space);
      return route.fulfill({ headers, json: membership });
    }
    if (!members.has(space)) return route.fulfill({ status: 403, headers });
    if (action === "messages") {
      const saved = messages.get(space) ?? [];
      if (request.method() === "GET") return route.fulfill({ headers, json: { messages: saved } });
      const body = request.postDataJSON();
      const message = { id: body.client_id, body: body.body, user_id: user.id, created_at: new Date().toISOString() };
      messages.set(space, [message, ...saved]);
      return route.fulfill({ status: 201, headers, json: message });
    }
    return route.fulfill({ status: 404, headers });
  });
  await mockOnboarding(page, true, true);
});

test("community discovery shows distinct cards and keeps sample counts out of rooms", async ({ page }, info) => {
  await page.goto("/chats");

  const beekeepers = page.getByRole("link", { name: "Beekeepers Hives and honey" });
  const farmers = page.getByRole("link", { name: "General Farmers Crops and fieldwork" });
  const createSpace = page.getByRole("link", { name: "Create space", exact: true });
  await expect(createSpace).toHaveCSS("background-color", "rgb(252, 153, 0)");
  await expect(beekeepers).toHaveCSS("border-inline-start-color", "rgb(255, 209, 68)");
  await expect(farmers).toHaveCSS("border-inline-start-color", "rgb(0, 138, 99)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("chats.png"), animations: "disabled" });

  await beekeepers.click();
  await expect(page.getByRole("heading", { name: "Beekeepers" })).toBeVisible();
  await expect(page.getByRole("log", { name: "Messages" })).toHaveCount(0);

  const join = page.getByRole("button", { name: "Join", exact: true });
  await expect(join).toHaveCSS("background-color", "rgb(252, 153, 0)");
  await join.click();
  await expect(page.getByRole("log", { name: "Messages" })).toBeVisible();
});

test("General Farmers has a crop-specific preview and conversation starters", async ({ page }, info) => {
  await page.goto("/chats");
  await page.getByRole("link", { name: "General Farmers Crops and fieldwork" }).click();
  await expect(page.getByRole("heading", { name: "General Farmers" })).toBeVisible();
  await expect(page.locator(".community-screen header img")).toHaveAttribute("src", /olive-foliage/);
  await expect(page.getByText("Ask crop questions")).toBeVisible();
  await expect(page.getByText("Trade practical tips")).toBeVisible();
  await expect(page.getByRole("log", { name: "Messages" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("general-farmers-preview.png"), fullPage: true, animations: "disabled" });

  await page.getByRole("button", { name: "Join this space" }).click();
  await expect(page.getByRole("heading", { name: "No messages yet" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("general-farmers-room.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Share a growing tip" }).click();
  const composer = page.getByRole("textbox", { name: "Message…" });
  await expect(composer).toBeFocused();
  await expect(composer).toHaveValue(/a growing tip/);
  await expect(page.getByRole("heading", { name: "No messages yet" })).toBeVisible();
  await composer.fill("I am planting cassava this week.");
  const saved = page.waitForResponse((response) => response.url().endsWith("/messages") && response.request().method() === "POST" && response.status() === 201);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await saved;
  await expect(page.getByRole("log").getByText("I am planting cassava this week.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("log").getByText("I am planting cassava this week.")).toBeVisible();
});
