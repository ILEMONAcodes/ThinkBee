import { AppError } from "@/lib/api/errors";
import { callbackUrl, getSupabase } from "@/lib/auth/client";
import { requiresEmailConfirmation } from "@/lib/auth/policy";

function authFailure(error: { code?: string; status?: number }): AppError {
  return new AppError(error.code ?? "auth_unavailable", error.status);
}

export async function registerAccount(name: string, email: string, password: string): Promise<void> {
  if (!requiresEmailConfirmation) {
    const { registerWithoutConfirmation } = await import("@/lib/auth/registration");
    return registerWithoutConfirmation(name, email, password);
  }
  const { error } = await getSupabase().auth.signUp({
    email, password,
    options: { emailRedirectTo: callbackUrl(), data: { display_name: name, chat_age_confirmed: true } },
  });
  if (error) throw authFailure(error);
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw authFailure(error);
}

export async function resendVerification(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resend({ type: "signup", email, options: { emailRedirectTo: callbackUrl() } });
  if (error) throw authFailure(error);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: callbackUrl() });
  if (error) throw authFailure(error);
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw authFailure(error);
}

let exchange: Promise<void> | undefined;
let pendingCode: string | null = null;
export function completeSignIn(): Promise<void> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const failed = url.searchParams.has("error") || new URLSearchParams(url.hash.slice(1)).has("error");
  if (code && code !== pendingCode) { pendingCode = code; exchange = undefined; }
  // Clear credentials and provider error text before rendering or navigating anywhere.
  window.history.replaceState(null, "", "/auth/callback");
  if (failed) return Promise.reject(new AppError("link_expired"));
  if (exchange) return exchange;
  exchange = (async () => {
    if (pendingCode) {
      const { error } = await getSupabase().auth.exchangeCodeForSession(pendingCode);
      if (error) {
        const retryable = !error.status || error.status >= 500;
        if (retryable) exchange = undefined;
        throw new AppError(retryable ? "provider_unavailable" : "link_expired");
      }
    }
    const { data, error } = await getSupabase().auth.getSession();
    if (error || !data.session) { exchange = undefined; throw new AppError("link_expired"); }
  })();
  return exchange;
}
