// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { sdk } = vi.hoisted(() => ({ sdk: { exchangeCodeForSession: vi.fn(), getSession: vi.fn(), signUp: vi.fn(), signInWithPassword: vi.fn(), resend: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn() } }));
vi.mock("@/lib/auth/client", () => ({ getSupabase: () => ({ auth: sdk }), callbackUrl: () => "https://app.test/auth/callback" }));
const { registerWithoutConfirmation } = vi.hoisted(() => ({ registerWithoutConfirmation: vi.fn() }));
vi.mock("@/lib/auth/registration", () => ({ registerWithoutConfirmation }));
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_AUTH_REQUIRE_EMAIL_CONFIRMATION", "true");
  vi.resetModules();
  vi.resetAllMocks();
  history.replaceState(null, "", "/auth/callback");
  sdk.getSession.mockResolvedValue({ data: { session: { user: { id: "owner" } } }, error: null });
  sdk.exchangeCodeForSession.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

it("uses isolated registration when email confirmation is disabled", async () => {
  vi.stubEnv("NEXT_PUBLIC_AUTH_REQUIRE_EMAIL_CONFIRMATION", "false");
  const { registerAccount } = await import("@/lib/auth/actions");
  await registerAccount("Ada", "a@example.test", "test password");
  expect(registerWithoutConfirmation).toHaveBeenCalledExactlyOnceWith("Ada", "a@example.test", "test password");
  expect(sdk.signUp).not.toHaveBeenCalled();
});

it("registers name and password with a confirmation redirect, and uses password auth for returning users", async () => {
  sdk.signUp.mockResolvedValue({ error: null });
  sdk.signInWithPassword.mockResolvedValue({ error: null });
  const { registerAccount, signInWithPassword } = await import("@/lib/auth/actions");
  await registerAccount("Ada", "a@example.test", "test password");
  expect(sdk.signUp).toHaveBeenCalledWith({ email: "a@example.test", password: "test password", options: { emailRedirectTo: "https://app.test/auth/callback", data: { display_name: "Ada", chat_age_confirmed: true } } });
  await signInWithPassword("a@example.test", "test password");
  expect(sdk.signInWithPassword).toHaveBeenCalledWith({ email: "a@example.test", password: "test password" });
});

it("preserves safe auth error codes without exposing provider messages", async () => {
  sdk.signInWithPassword.mockResolvedValue({ error: { code: "email_not_confirmed", status: 400, message: "private provider details" } });
  const { signInWithPassword } = await import("@/lib/auth/actions");
  await expect(signInWithPassword("a@example.test", "test password")).rejects.toMatchObject({ code: "email_not_confirmed", message: "email_not_confirmed", status: 400 });
});

it("resends verification without resubmitting a password and uses the allowed callback for recovery", async () => {
  sdk.resend.mockResolvedValue({ error: null });
  sdk.resetPasswordForEmail.mockResolvedValue({ error: null });
  sdk.updateUser.mockResolvedValue({ error: null });
  const { resendVerification, requestPasswordReset, updatePassword } = await import("@/lib/auth/actions");
  await resendVerification("a@example.test");
  expect(sdk.resend).toHaveBeenCalledWith({ type: "signup", email: "a@example.test", options: { emailRedirectTo: "https://app.test/auth/callback" } });
  await requestPasswordReset("a@example.test");
  expect(sdk.resetPasswordForEmail).toHaveBeenCalledWith("a@example.test", { redirectTo: "https://app.test/auth/callback" });
  await updatePassword("changed password");
  expect(sdk.updateUser).toHaveBeenCalledWith({ password: "changed password" });
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
