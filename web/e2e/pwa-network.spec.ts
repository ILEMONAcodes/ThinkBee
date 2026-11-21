import { expect } from "@playwright/test";

import { mockOnboarding } from "./onboarding-fixture";

import { test } from "./pwa-network-fixture";

test.beforeEach(async ({ page, network }) => {
  await mockOnboarding(page, true, true);
  await page.goto(network.origin);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
});

test("uses a cached page or offline fallback during a server outage and recovers Home", async ({ page, network }) => {
  await expect(page.getByRole("heading", { name: "Your farm dashboard" })).toBeVisible();
  await page.goto(`${network.origin}/records`);
  await page.waitForFunction(async () => Boolean(await (await caches.open("thinkbee-pages")).match("/records")));
  // The proxy takes down the page route, while this reproduces the device’s offline signal.
  await page.addInitScript(() => Object.defineProperty(navigator, "onLine", { get: () => false }));
  network.failures.set("/records", 503);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Records and reminders" })).toBeVisible();
  network.failures.set("/uncached-outage", 502);
  await page.goto(`${network.origin}/uncached-outage`);
  await expect(page.getByRole("heading", { name: "No signal right now" })).toBeVisible();

  network.failures.set("/", 503);
  const recovery = page.getByRole("link", { name: "Open Think Bee" });
  expect((await recovery.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  const [home] = await Promise.all([
    page.waitForResponse((response) => response.request().isNavigationRequest() && new URL(response.url()).pathname === "/"),
    recovery.click(),
  ]);
  expect(home.fromServiceWorker()).toBe(true);
  await expect(page).toHaveURL(`${network.origin}/`);
  await expect(page.getByRole("heading", { name: "Your farm dashboard" })).toBeVisible();
});

test("bounds stalled uncached navigation and RSC requests", async ({ page, network }) => {
  network.stalls.add("/uncached-stalled");
  await page.goto(`${network.origin}/uncached-stalled`, { waitUntil: "domcontentloaded", timeout: 8000 });
  await expect(page.getByRole("heading", { name: "No signal right now" })).toBeVisible();
  network.stalls.add("/stalled-rsc");
  const result = await page.evaluate(async () => {
    const started = performance.now();
    try {
      await fetch("/stalled-rsc?_rsc=test", { headers: { RSC: "1" }, signal: AbortSignal.timeout(8000) });
      return { failed: false, elapsed: performance.now() - started };
    } catch {
      return { failed: true, elapsed: performance.now() - started };
    }
  });
  expect(result.failed).toBe(true);
  expect(result.elapsed).toBeLessThan(7000);
});

test("a reconnect event cannot interrupt an in-flight offline fallback", async ({ page, network }) => {
  network.stalls.add("/uncached-reconnect");
  const target = `${network.origin}/uncached-reconnect`;
  await Promise.all([
    page.waitForURL(target, { waitUntil: "load", timeout: 8000 }),
    page.evaluate((url) => {
      // Deliver the event during the worker's four-second network deadline.
      setTimeout(() => {
        sessionStorage.setItem("test-reconnect-dispatched", "1");
        window.dispatchEvent(new Event("online"));
      }, 100);
      window.location.assign(url);
    }, target),
  ]);
  expect(await page.evaluate(() => sessionStorage.getItem("test-reconnect-dispatched"))).toBe("1");
  await expect(page).toHaveURL(target);
  await expect(page.getByRole("heading", { name: "No signal right now" })).toBeVisible();
});

test("keeps root callbacks and signed images out of worker caches", async ({ page, network }) => {
  await page.goto(`${network.origin}/?code=synthetic-test-code`);
  await page.waitForURL("**/auth/callback?code=synthetic-test-code");
  await page.evaluate(async () => {
    await fetch("/onboarding/hive.webp?X-Amz-Signature=synthetic");
    await fetch(`/_next/image?url=${encodeURIComponent("/onboarding/hive.webp?token=synthetic")}&w=640&q=75`);
  });
  const privateEntries = await page.evaluate(async () => {
    const entries: string[] = [];
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) {
        if (/synthetic/.test(request.url)) entries.push(request.url);
      }
    }
    return entries;
  });
  expect(privateEntries).toEqual([]);
});

test("applies a waiting update and removes old private cache entries", async ({ page, network }) => {
  await page.evaluate(async () => {
    const cache = await caches.open("thinkbee-pages");
    await cache.put("/?code=old-synthetic-code", new Response("old callback"));
    await cache.put("/public-saved", new Response("public page"));
  });
  network.workerRevision++;
  await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
  await expect(page.getByText("A newer version of Think Bee is ready.")).toBeVisible();
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await expect.poll(() => page.evaluate(async () => {
    const cache = await caches.open("thinkbee-pages");
    return Boolean(await cache.match("/?code=old-synthetic-code"));
  }).catch(() => true)).toBe(false);
  expect(await page.evaluate(async () => Boolean(await (await caches.open("thinkbee-pages")).match("/public-saved")))).toBe(true);
  await expect(page.getByText("A newer version of Think Bee is ready.")).toBeHidden();
});
