import { expect, test } from "@playwright/test";

import { mockOnboarding, user } from "./onboarding-fixture";

test.use({ serviceWorkers: "block" });

test("sends an authenticated photo and reopens the persisted result", async ({ page }) => {
  // Log all network requests to debug
  page.on("request", (req) => console.log("REQUEST:", req.method(), req.url()));
  page.on("response", (res) => console.log("RESPONSE:", res.status(), res.url()));
  const scanId = crypto.randomUUID();
  const key = `scans/${user.id}/${crypto.randomUUID().replaceAll("-", "")}.webp`;
  let scan: Record<string, unknown> | undefined;

  // Set up onboarding routes (auth bootstrap, profile, etc.)
  await mockOnboarding(page, true, true);

  // Set up scans route handler AFTER so it takes priority over the onboarding catch-all
  await page.context().route(/\/api\/v1\/scans/, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    console.log("SCANS MOCK", request.method(), path);
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    expect(request.headers().authorization).toMatch(/^Bearer /);
    if (path.endsWith("/photos")) {
      expect(request.headers()["content-type"]).toBe("application/octet-stream");
      expect(request.postDataBuffer()?.subarray(8, 12).toString()).toBe("WEBP");
      return route.fulfill({ status: 201, headers, json: { key } });
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      expect(body).toMatchObject({ subject: "crop", subject_type: "tomato", image_keys: [key] });
      expect(body.client_id).toMatch(/^[\da-f-]{36}$/);
      scan = {
        id: scanId, user_id: user.id, subject: body.subject, subject_type: body.subject_type,
        status: "done", created_at: new Date().toISOString(),
        result: { status: "completed", overall_confidence: "low", likely_causes: [], observations: ["The visible leaves are green."], next_steps: [], follow_up_questions: [] },
      };
      return route.fulfill({ status: 202, headers, json: { id: scanId, status: "done" } });
    }
    if (scan && path.endsWith(scanId)) return route.fulfill({ headers, json: scan });
    return route.fulfill({ status: 404, headers });
  });

  // First navigate to home page to clear app lock via head script.
  // The head script in layout.tsx runs during HTML parse and checks localStorage.
  // By navigating to "/" first, we ensure the head script runs with cleared localStorage
  // (mockOnboarding's addInitScript removes the lock before any navigation).
  // This prevents the "Checking app lock..." cover from appearing on the scan page.
  const bootstrapPromise = page.waitForResponse(resp => resp.url().includes("/api/v1/auth/bootstrap"), { timeout: 15_000 });
  await page.goto("/", { waitUntil: "networkidle" });
  await bootstrapPromise;

  // Now navigate to scan page - localStorage is already cleared, head script won't set data-app-lock
  // Set up the wait BEFORE navigation to catch the bootstrap request
  const bootstrapPromise2 = page.waitForResponse(resp => resp.url().includes("/api/v1/auth/bootstrap"), { timeout: 15_000 });
  await page.goto("/scan?subject=crop", { waitUntil: "networkidle" });
  await bootstrapPromise2;

  // Reload so appLockBootScript runs with clean localStorage and React re-initializes lock
  const bootstrapPromise3 = page.waitForResponse(resp => resp.url().includes("/api/v1/auth/bootstrap"), { timeout: 15_000 });
  await page.reload({ waitUntil: "networkidle" });
  await bootstrapPromise3;
  // Force hide app lock cover and unlock app content (CSS may not apply in test environment)
  await page.evaluate(() => {
    document.documentElement.removeAttribute("data-app-lock");
    const cover = document.getElementById("app-lock-cover");
    if (cover) cover.style.display = "none";
    const content = document.getElementById("app-content");
    if (content) {
      content.style.visibility = "visible";
      content.style.pointerEvents = "auto";
      content.inert = false;
    }
  });
  // Debug: check localStorage and sessionStorage
  const storage = await page.evaluate(() => ({
    localStorage: { ...localStorage },
    sessionStorage: { ...sessionStorage },
  }));
  console.log("Storage:", storage);
  // Debug: dump page HTML
  const pageHtml = await page.evaluate(() => document.documentElement.outerHTML.substring(0, 5000));
  console.log("Page HTML:", pageHtml);
  // Wait for the scan uploader to be visible (RequireAccount must resolve first)
  await expect(page.locator('input[type="file"]:not([capture])')).toBeAttached({ timeout: 15_000 });
  await page.locator('input[type="file"]:not([capture])').setInputFiles("public/photos/glossy-leaves.webp");
  await page.locator("select").selectOption("tomato");
  await page.getByRole("button", { name: "Analyse", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(scanId));
  await expect(page.getByText("The visible leaves are green.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("The visible leaves are green.")).toBeVisible();
});
