import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "@/lib/api/errors";

let client: SupabaseClient | undefined;

export function getSupabaseConfiguration(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || key.startsWith("sb_secret_")) throw new AppError("auth_configuration");
  if (key.startsWith("eyJ")) {
    try {
      const claims = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string };
      if (claims.role !== "anon") throw new AppError("auth_configuration");
    } catch { throw new AppError("auth_configuration"); }
  }
  return { url, key };
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const { url, key } = getSupabaseConfiguration();
  // This singleton is the only owner of browser auth persistence and refresh.
  client = createClient(url, key, {
    auth: { flowType: "pkce", detectSessionInUrl: false, persistSession: true, autoRefreshToken: true },
  });
  return client;
}

export function callbackUrl(): string {
  const configured = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL;
  const current = new URL("/auth/callback", window.location.origin);
  if (configured) {
    const candidate = new URL(configured);
    if (candidate.origin === current.origin && candidate.pathname === current.pathname) return current.href;
  }
  // Never send credentials to a different origin through a stale deployment setting.
  return current.href;
}
