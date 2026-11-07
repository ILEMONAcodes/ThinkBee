import { describe, expect, it } from "vitest";

import { isPrivateUrl, isPublicImage } from "@/lib/pwa/cache-policy";

const url = (path: string) => new URL(path, "https://thinkbee.test");

describe("worker cache privacy", () => {
  it.each([
    "/?code=one-time-code", "/?error=access_denied", "/?access_token=secret",
    "/auth/callback", "/sign-in", "/setup/profile", "/api/v1/me",
    "/photo.webp?X-Amz-Signature=secret", "/photo.webp?token=secret",
  ])("keeps %s out of runtime caches", (path) => {
    expect(isPrivateUrl(url(path))).toBe(true);
  });

  it("keeps ordinary app navigation cacheable", () => {
    expect(isPrivateUrl(url("/records?filter=hive"))).toBe(false);
    expect(isPrivateUrl(url("/?utm_source=home"))).toBe(false);
  });

  it("caches public original and optimized images", () => {
    expect(isPublicImage(url("/onboarding/hive.webp"))).toBe(true);
    expect(isPublicImage(url("/_next/image?url=%2Fonboarding%2Fhive.webp&w=640&q=75"))).toBe(true);
  });

  it.each([
    "/photo.webp?token=private",
    "/_next/image?url=" + encodeURIComponent("/photo.webp?X-Amz-Signature=private"),
    "/_next/image?url=" + encodeURIComponent("/photo.webp?token=private"),
    "/_next/image?url=" + encodeURIComponent("/api/v1/photo.webp"),
    "/_next/image?url=" + encodeURIComponent("https://storage.test/photo.webp"),
    "/_next/image?url=http://[", "/_next/image", "/records",
  ])("does not cache unsafe or invalid image request %s", (path) => {
    expect(isPublicImage(url(path))).toBe(false);
  });
});
