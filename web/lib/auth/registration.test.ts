// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";

const { auth, createClient } = vi.hoisted(() => {
  const auth = { initialize: vi.fn(), signUp: vi.fn(), dispose: vi.fn() };
  return { auth, createClient: vi.fn(() => ({ auth })) };
});
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/lib/auth/client", () => ({ getSupabaseConfiguration: () => ({ url: "https://auth.example.test", key: "public-test-key" }) }));

beforeEach(() => {
  vi.clearAllMocks();
  auth.initialize.mockResolvedValue({ error: null });
  auth.signUp.mockResolvedValue({ data: { session: { user: { id: "test-user" } } }, error: null });
  auth.dispose.mockResolvedValue(undefined);
});

it("creates an isolated, nonpersistent signup session without requesting an email link", async () => {
  const { registerWithoutConfirmation } = await import("@/lib/auth/registration");
  await registerWithoutConfirmation("Ada", "a@example.test", "test password");
  expect(createClient).toHaveBeenCalledWith("https://auth.example.test", "public-test-key", {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: expect.stringMatching(/^thinkbee-registration-/) },
  });
  expect(auth.signUp).toHaveBeenCalledExactlyOnceWith({ email: "a@example.test", password: "test password", options: { data: { display_name: "Ada", chat_age_confirmed: true } } });
  expect(auth.dispose).toHaveBeenCalledOnce();
});

it("reports the configuration mismatch when Supabase still requires confirmation", async () => {
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  const { registerWithoutConfirmation } = await import("@/lib/auth/registration");
  await expect(registerWithoutConfirmation("Ada", "a@example.test", "test password")).rejects.toMatchObject({ code: "email_confirmation_required" });
  expect(auth.dispose).toHaveBeenCalledOnce();
});

it("preserves safe provider error codes and cleans up after a rejected registration", async () => {
  auth.signUp.mockResolvedValue({ data: { session: null }, error: { code: "user_already_exists", status: 422, message: "Private provider details" } });
  const { registerWithoutConfirmation } = await import("@/lib/auth/registration");
  await expect(registerWithoutConfirmation("Ada", "a@example.test", "test password")).rejects.toMatchObject({ code: "user_already_exists", status: 422, message: "user_already_exists" });
  expect(auth.dispose).toHaveBeenCalledOnce();
});

it("cleans up after a transport failure without reporting success", async () => {
  auth.signUp.mockRejectedValue(new TypeError("Network unavailable"));
  const { registerWithoutConfirmation } = await import("@/lib/auth/registration");
  await expect(registerWithoutConfirmation("Ada", "a@example.test", "test password")).rejects.toThrow("Network unavailable");
  expect(auth.dispose).toHaveBeenCalledOnce();
});
