import { AppError } from "@/lib/api/errors";
import { callbackUrl, getSupabase } from "@/lib/auth/client";

export async function sendSignInLink(email: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl(), data: { chat_age_confirmed: true } },
  });
  if (error) throw new AppError("sign_in_failed", error.status);
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
