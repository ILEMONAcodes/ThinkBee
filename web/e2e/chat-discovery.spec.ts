import { expect, test } from "@playwright/test";

test("community discovery shows distinct cards and keeps sample counts out of rooms", async ({ page }) => {
  await page.goto("/chats");

  const beekeepers = page.getByRole("link", { name: "Beekeepers Hives and honey" });
  const farmers = page.getByRole("link", { name: "General Farmers Crops and fieldwork" });
  await expect(beekeepers).toHaveCSS("border-inline-start-color", "rgb(255, 209, 68)");
  await expect(farmers).toHaveCSS("border-inline-start-color", "rgb(0, 138, 99)");
  await expect(page.getByText(/\d[\d,]* members?\b/i)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await beekeepers.click();
  await expect(page.getByRole("heading", { name: "Beekeepers" })).toBeVisible();
  await expect(page.getByText(/\d[\d,]* members?\b/i)).toHaveCount(0);
  await expect(page.getByRole("log", { name: "Messages" })).toHaveCount(0);

  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByRole("log", { name: "Messages" })).toBeVisible();
  await expect(page.getByText(/\d[\d,]* members?\b/i)).toHaveCount(0);
});
