import { expect, test } from "@playwright/test";

import { mockOnboarding, user } from "./onboarding-fixture";

test.use({ serviceWorkers: "block" });

test("sends an authenticated photo and reopens the persisted result", async ({ page }) => {
  const scanId = crypto.randomUUID();
  const key = `scans/${user.id}/${crypto.randomUUID().replaceAll("-", "")}.webp`;
  let scan: Record<string, unknown> | undefined;

  await mockOnboarding(page, true, true);

  await page.context().route(/\/api\/v1\/scans/, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
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

  await page.goto("/scan?subject=crop");
  await expect(page.locator('input[type="file"]:not([capture])')).toBeAttached({ timeout: 15_000 });
  await page.locator('input[type="file"]:not([capture])').setInputFiles("public/photos/glossy-leaves.webp");
  await page.locator("select").selectOption("tomato");
  await page.getByRole("button", { name: "Analyse", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(scanId));
  await expect(page.getByText("The visible leaves are green.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("The visible leaves are green.")).toBeVisible();
});