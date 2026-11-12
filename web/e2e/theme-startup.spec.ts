import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("appearance works offline when scripts requested after startup cannot load", async ({ page, context }) => {
  const response = await page.request.get("/me");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  const initialScripts = new Set([...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)]
    .map(([, source]) => new URL(source, response.url()).pathname));
  expect(initialScripts.size).toBeGreaterThan(0);
  // Keep the page's initial scripts, then simulate losing signal before deferred chunks arrive.
  await page.route("**/_next/static/**/*.js", (route) => initialScripts.has(new URL(route.request().url()).pathname)
    ? route.continue() : route.abort("internetdisconnected"));
  await page.goto("/me");
  const light = page.getByRole("radio", { name: "Light", exact: true });
  await expect(light).toBeEnabled();
  await context.setOffline(true);
  await light.check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
