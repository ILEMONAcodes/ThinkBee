import type { Page } from "@playwright/test";

import type { components } from "../lib/api/schema";

try { process.loadEnvFile(".env.local"); } catch { /* CI supplies test configuration. */ }
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://thinkbee-test.supabase.co";
const owner = "11111111-1111-4111-8111-111111111111";
const timestamp = "2026-11-07T00:00:00Z";
type Schema = components["schemas"];
export const user: Schema["UserResponse"] = { id: "019a4ff0-0000-7000-8000-000000000001", farmer_id: "TB-12345678", status: "active", is_think_bee_admin: false, locale: "en-NG", last_seen_at: timestamp, created_at: timestamp, updated_at: timestamp };
export const profile: Schema["ProfileResponse"] = { display_name: "Ada", bio: "I grow cassava.", photo_key: null, area_state: null, area_lga: null, show_crops: false, show_hive_type: false, created_at: timestamp, updated_at: timestamp };

export async function mockOnboarding(page: Page, signedIn = true, withProfile = false) {
  const fakeUser = { id: owner, aud: "authenticated", role: "authenticated", email: "farmer@example.test", app_metadata: { provider: "email" }, user_metadata: {} as { display_name?: string }, created_at: timestamp };
  const jwt = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: owner, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`;
  const session = { access_token: jwt, refresh_token: "fake-refresh-for-browser-tests", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: fakeUser };
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  await page.addInitScript(({ storageKey, session, signedIn }) => {
    localStorage.setItem("thinkbee-welcome-seen", "1");
    // Synthetic SDK-owned session fixture; production never copies auth tokens.
    if (signedIn && !sessionStorage.getItem("seeded")) {
      localStorage.setItem(storageKey, JSON.stringify(session));
      sessionStorage.setItem("seeded", "1");
    }
  }, { storageKey, session, signedIn });
  const state = { profile: withProfile ? { ...profile } : undefined as Schema["ProfileResponse"] | undefined, farms: new Map<string, Schema["FarmResponse"]>(), units: new Map<string, Schema["UnitResponse"]>(), signupCount: 0, resendCount: 0, recoverCount: 0, passwordCount: 0, passwordUpdates: 0, tokenCount: 0, signupStatus: 200, signInError: "", failUnitOnce: false, bootstrapStatus: 200, profileWrites: 0, logoutStatus: 204, logoutCount: 0 };
  // Context routes also intercept fetches made by the controlling service worker.
  await page.context().route("**/auth/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/signup")) {
      state.signupCount++;
      fakeUser.user_metadata.display_name = route.request().postDataJSON().data.display_name;
      await route.fulfill({ status: state.signupStatus, json: state.signupStatus === 200 ? fakeUser : { code: "over_email_send_rate_limit", msg: "Private provider information" } });
    }
    else if (path.endsWith("/resend")) { state.resendCount++; await route.fulfill({ json: {} }); }
    else if (path.endsWith("/recover")) { state.recoverCount++; await route.fulfill({ json: {} }); }
    else if (path.endsWith("/token")) {
      if (new URL(route.request().url()).searchParams.get("grant_type") === "password") {
        state.passwordCount++;
        if (state.signInError) return route.fulfill({ status: 400, json: { error_code: state.signInError, msg: "Private provider information" } });
      } else state.tokenCount++;
      await route.fulfill({ json: session });
    }
    else if (path.endsWith("/user")) {
      if (route.request().method() === "PUT") state.passwordUpdates++;
      await route.fulfill({ json: fakeUser });
    }
    else if (path.endsWith("/logout")) {
      state.logoutCount++;
      await route.fulfill(state.logoutStatus === 204 ? { status: 204 } : { status: state.logoutStatus, json: { msg: "Unavailable" } });
    }
    else await route.fulfill({ status: 400, json: { error: "unexpected_auth_request" } });
  });
  await page.context().route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "GET,POST,PATCH,OPTIONS" };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (!request.headers().authorization?.startsWith("Bearer ")) return route.fulfill({ status: 401, headers, json: { error: { code: "auth_required", message: "Sign in" } } });
    if (path === "/auth/bootstrap") return route.fulfill({ status: state.bootstrapStatus, headers, json: state.bootstrapStatus === 200 ? { user, is_new: !state.profile } : { error: { code: state.bootstrapStatus === 403 ? "account_suspended" : "account_store_unavailable", message: "Internal details must not appear" } } });
    if (path === "/me/chat-profile") {
      if (request.method() === "PATCH") { state.profileWrites++; state.profile = { ...profile, ...request.postDataJSON() }; }
      return route.fulfill({ status: state.profile ? 200 : 404, headers, json: state.profile ?? { error: { code: "profile_not_found", message: "Add profile" } } });
    }
    if (path === "/farms") {
      if (request.method() === "GET") return route.fulfill({ headers, json: { items: [...state.farms.values()], next_cursor: null } });
      const body = request.postDataJSON() as Schema["FarmCreate"];
      if (!state.farms.has(body.client_id)) state.farms.set(body.client_id, { ...body, id: crypto.randomUUID(), created_at: timestamp, updated_at: timestamp });
      return route.fulfill({ status: 201, headers, json: state.farms.get(body.client_id) });
    }
    if (/^\/farms\/[^/]+\/units$/.test(path)) {
      const body = request.postDataJSON() as Schema["UnitCreate"];
      if (!state.units.has(body.client_id)) state.units.set(body.client_id, { ...body, details: body.details ?? {}, id: crypto.randomUUID(), farm_id: path.split("/")[2], created_at: timestamp, updated_at: timestamp });
      if (state.failUnitOnce) { state.failUnitOnce = false; return route.abort("failed"); }
      return route.fulfill({ status: 201, headers, json: state.units.get(body.client_id) });
    }
    return route.fulfill({ status: 500, headers, json: { error: { code: "unexpected_request", message: path } } });
  });
  return state;
}
