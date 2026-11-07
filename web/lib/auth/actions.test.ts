// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";

const { sdk } = vi.hoisted(() => ({ sdk: { exchangeCodeForSession: vi.fn(), getSession: vi.fn(), signInWithOtp: vi.fn() } }));
vi.mock("@/lib/auth/client", () => ({ getSupabase: () => ({ auth: sdk }), callbackUrl: () => "https://app.test/auth/callback" }));
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  history.replaceState(null, "", "/auth/callback");
  sdk.getSession.mockResolvedValue({ data: { session: { user: { id: "owner" } } }, error: null });
  sdk.exchangeCodeForSession.mockResolvedValue({ error: null });
});

it("deduplicates exchange and scrubs the callback URL immediately", async () => {
  history.replaceState(null, "", "/auth/callback?code=private-code");
  const { completeSignIn } = await import("@/lib/auth/actions");
  const first = completeSignIn();
  expect(location.search).toBe("");
  await Promise.all([first, completeSignIn()]);
  expect(sdk.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith("private-code");
});
it("allows a later sign-in code in the same app session", async () => {
  const { completeSignIn } = await import("@/lib/auth/actions");
  history.replaceState(null, "", "/auth/callback?code=first");
  await completeSignIn();
  history.replaceState(null, "", "/auth/callback?code=second");
  await completeSignIn();
  expect(sdk.exchangeCodeForSession).toHaveBeenCalledTimes(2);
});
it("does not treat provider denial as a successful existing session", async () => {
  history.replaceState(null, "", "/auth/callback#error=access_denied&error_description=private");
  const { completeSignIn } = await import("@/lib/auth/actions");
  await expect(completeSignIn()).rejects.toMatchObject({ code: "link_expired" });
  expect(location.hash).toBe("");
  expect(sdk.exchangeCodeForSession).not.toHaveBeenCalled();
});
it("can retry a provider outage without storing the code", async () => {
  history.replaceState(null, "", "/auth/callback?code=retry-code");
  sdk.exchangeCodeForSession.mockResolvedValueOnce({ error: { status: 503 } });
  const { completeSignIn } = await import("@/lib/auth/actions");
  await expect(completeSignIn()).rejects.toMatchObject({ code: "provider_unavailable" });
  await completeSignIn();
  expect(sdk.exchangeCodeForSession).toHaveBeenCalledTimes(2);
});
