import type { Page, BrowserContext } from "@playwright/test";

import type { Components as components } from "@/lib/api/schema";

try { process.loadEnvFile(".env.local"); } catch { /* CI supplies test configuration. */ }
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://thinkbee-test.supabase.co";
console.log("[onboarding-fixture] Loaded supabaseUrl:", supabaseUrl);
const owner = "11111111-1111-4111-8111-111111111111";
const timestamp = "2026-11-07T00:00:00Z";
type Schema = components["schemas"];
export const user: Schema["UserResponse"] = { id: "019a4ff0-0000-7000-8000-000000000001", farmer_id: "TB-12345678", status: "active", is_think_bee_admin: false, locale: "en-NG", last_seen_at: timestamp, created_at: timestamp, updated_at: timestamp };
export const profile: Schema["ProfileResponse"] = { display_name: "Ada", bio: "I grow cassava.", photo_key: null, area_state: null, area_lga: null, show_crops: false, show_hive_type: false, created_at: timestamp, updated_at: timestamp };

/** Call this on a BrowserContext BEFORE creating the page to disable app lock. */
export function disableAppLock(context: BrowserContext) {
  context.addInitScript(() => {
    console.log("[disableAppLock] START");
    try {
      const before = localStorage.getItem("thinkbee-app-lock");
      console.log("[disableAppLock] before:", before);
      localStorage.removeItem("thinkbee-app-lock");
      const after = localStorage.getItem("thinkbee-app-lock");
      console.log("[disableAppLock] after:", after);

      // documentElement may not exist yet; defer removal
      if (document.documentElement) {
        const hasAttr = document.documentElement.hasAttribute("data-app-lock");
        console.log("[disableAppLock] data-app-lock before remove:", hasAttr);
        document.documentElement.removeAttribute("data-app-lock");
        const hasAttrAfter = document.documentElement.hasAttribute("data-app-lock");
        console.log("[disableAppLock] data-app-lock after remove:", hasAttrAfter);
      } else {
        console.log("[disableAppLock] documentElement not ready, scheduling removal");
        // Use MutationObserver or setTimeout to wait for documentElement
        const check = setInterval(() => {
          if (document.documentElement) {
            clearInterval(check);
            document.documentElement.removeAttribute("data-app-lock");
            console.log("[disableAppLock] deferred removal done, has:", document.documentElement.hasAttribute("data-app-lock"));
          }
        }, 0);
      }
    } catch (e) {
      console.log("[disableAppLock] ERROR:", e);
    }
    console.log("[disableAppLock] END");
  });
}

/** Call this on a Page to seed auth and API mocks. Must be called before navigation. */
export async function mockOnboarding(page: Page, signedIn = true, withProfile = false, welcomeSeen = true) {
  console.log("[mockOnboarding] ENTERED function, signedIn:", signedIn, "withProfile:", withProfile, "welcomeSeen:", welcomeSeen);
  const fakeUser = { id: owner, aud: "authenticated", role: "authenticated", email: "farmer@example.test", app_metadata: { provider: "email" }, user_metadata: {} as { display_name?: string }, created_at: timestamp };
  const jwt = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: owner, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`;
  const session = { access_token: jwt, refresh_token: "fake-refresh-for-browser-tests", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: fakeUser };
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;

  // Page-level init script runs before navigation scripts (but after head scripts)
  // We already cleared app lock at context level, but do it again as a belt-and-suspenders
  await page.addInitScript(({ storageKey, session, signedIn, welcomeSeen }) => {
    console.log("[mockOnboarding initScript] START, signedIn:", signedIn, "storageKey:", storageKey);
    try {
      if (welcomeSeen) localStorage.setItem("thinkbee-welcome-seen", "1");
      // NOTE: Do NOT clear app lock here - tests that need it disabled call disableAppLock(context) explicitly.
      // This allows app-lock tests to seed their own lock state.
      if (signedIn && !sessionStorage.getItem("seeded")) {
        const sessionStr = JSON.stringify(session);
        console.log("[mockOnboarding initScript] About to set localStorage with key:", storageKey, "sessionStr length:", sessionStr.length);
        localStorage.setItem(storageKey, sessionStr);
        sessionStorage.setItem("seeded", "1");
        const verify = localStorage.getItem(storageKey);
        console.log("[mockOnboarding initScript] session seeded, verified:", verify ? verify.substring(0, 50) + "..." : "NOT FOUND");
      }
      console.log("[mockOnboarding initScript] END, localStorage keys:", Object.keys(localStorage));
    } catch (e) {
      console.error("[mockOnboarding initScript] ERROR:", e);
    }
  }, { storageKey, session, signedIn, welcomeSeen });

  // Also add a page-level init script to wait for session to be available
  await page.addInitScript(() => {
    console.log("[mockOnboarding waitForSession] checking for session...");
    const check = setInterval(() => {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-'));
      if (sbKey) {
        clearInterval(check);
        const val = localStorage.getItem(sbKey);
        console.log("[mockOnboarding waitForSession] found session key:", sbKey, "value preview:", val ? val.substring(0, 80) + "..." : "empty");
      }
    }, 10);
    // Also log all localStorage keys after a bit
    setTimeout(() => {
      console.log("[mockOnboarding waitForSession] ALL localStorage keys:", Object.keys(localStorage));
    }, 1000);
  });

  const state = { profile: withProfile ? { ...profile } : undefined as Schema["ProfileResponse"] | undefined, farms: new Map<string, Schema["FarmResponse"]>(), units: new Map<string, Schema["UnitResponse"]>(), signupCount: 0, signupHasCodeChallenge: false, signupRequiresConfirmation: false, bootstrapCount: 0, bootstrapDelayMs: 0, resendCount: 0, recoverCount: 0, passwordCount: 0, passwordUpdates: 0, tokenCount: 0, signupStatus: 200, signInError: "", failUnitOnce: false, bootstrapStatus: 200, profileWrites: 0, logoutStatus: 204, logoutCount: 0 };
  // Context routes also intercept fetches made by the controlling service worker.

  // 1. FIRST: Intercept Supabase auth at the actual URL (handles signup, resend, recover, token, user, logout)
  // Use RegExp for reliable full-URL matching including protocol
  const supabaseAuthPattern = new RegExp(`^${supabaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/auth/v1/`);
  console.log("[mockOnboarding] Registering Supabase route with pattern:", supabaseAuthPattern);
  await page.context().route(supabaseAuthPattern, async (route) => {
    const url = route.request().url();
    const path = new URL(url).pathname;
    console.log("[mockOnboarding Supabase] auth request HIT:", url, "path:", path);
    if (path.endsWith("/signup")) {
      state.signupCount++;
      fakeUser.user_metadata.display_name = route.request().postDataJSON().data.display_name;
      state.signupHasCodeChallenge = !!route.request().postDataJSON().code_challenge;
      await route.fulfill({ status: state.signupStatus, json: state.signupStatus === 200 ? state.signupRequiresConfirmation ? fakeUser : session : { code: "over_request_rate_limit", msg: "Private provider information" } });
    }
    else if (path.endsWith("/resend")) { state.resendCount++; await route.fulfill({ json: {} }); }
    else if (path.endsWith("/recover")) { state.recoverCount++; await route.fulfill({ json: {} }); }
    else if (path.endsWith("/token")) {
      if (new URL(url).searchParams.get("grant_type") === "password") {
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

  // 1b. ALSO intercept relative /auth/v1/** for signup/resend/recover (app may use relative URLs)
  await page.context().route("**/auth/v1/signup", async (route) => {
    const url = route.request().url();
    console.log("[mockOnboarding API] signup request MATCHED:", url, "method:", route.request().method());
    if (url.includes(supabaseUrl)) return route.continue();
    state.signupCount++;
    fakeUser.user_metadata.display_name = route.request().postDataJSON().data.display_name;
    state.signupHasCodeChallenge = !!route.request().postDataJSON().code_challenge;
    console.log("[mockOnboarding API] signup response: status", state.signupStatus, "signupRequiresConfirmation:", state.signupRequiresConfirmation);
    await route.fulfill({ status: state.signupStatus, json: state.signupStatus === 200 ? state.signupRequiresConfirmation ? fakeUser : session : { code: "over_request_rate_limit", msg: "Private provider information" } });
  });
  await page.context().route("**/auth/v1/resend", async (route) => {
    const url = route.request().url();
    console.log("[mockOnboarding API] resend request MATCHED:", url);
    if (url.includes(supabaseUrl)) return route.continue();
    state.resendCount++;
    await route.fulfill({ json: {} });
  });
  await page.context().route("**/auth/v1/recover", async (route) => {
    const url = route.request().url();
    console.log("[mockOnboarding API] recover request MATCHED:", url);
    if (url.includes(supabaseUrl)) return route.continue();
    state.recoverCount++;
    await route.fulfill({ json: {} });
  });

  // 1c. Catch-all for any other auth/v1 paths on our API
  await page.context().route("**/auth/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes(supabaseUrl)) return route.continue();
    const path = new URL(url).pathname;
    console.log("[mockOnboarding API] auth/v1 request MATCHED:", url, "path:", path);
    if (path.endsWith("/token")) {
      if (new URL(url).searchParams.get("grant_type") === "password") {
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

  // 2. SECOND: Intercept our API auth routes (relative /auth/v1/** on our API domain)
  await page.context().route("**/auth/v1/**", async (route) => {
    const url = route.request().url();
    // Skip if this is the real Supabase URL - already handled above
    if (url.includes(supabaseUrl)) return route.continue();
    const path = new URL(url).pathname;
    if (path.endsWith("/signup")) {
      state.signupCount++;
      fakeUser.user_metadata.display_name = route.request().postDataJSON().data.display_name;
      state.signupHasCodeChallenge = !!route.request().postDataJSON().code_challenge;
      await route.fulfill({ status: state.signupStatus, json: state.signupStatus === 200 ? state.signupRequiresConfirmation ? fakeUser : session : { code: "over_request_rate_limit", msg: "Private provider information" } });
    }
    else if (path.endsWith("/resend")) { state.resendCount++; await route.fulfill({ json: {} }); }
    else if (path.endsWith("/recover")) { state.recoverCount++; await route.fulfill({ json: {} }); }
    else if (path.endsWith("/token")) {
      if (new URL(url).searchParams.get("grant_type") === "password") {
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

  // 2b. EXPLICIT fallback for full Supabase URL signup (in case pattern matching fails)
  const supabaseSignupUrl = `${supabaseUrl}/auth/v1/signup`;
  await page.context().route(supabaseSignupUrl, async (route) => {
    console.log("[mockOnboarding Supabase] EXPLICIT signup fallback HIT:", route.request().url());
    state.signupCount++;
    fakeUser.user_metadata.display_name = route.request().postDataJSON().data.display_name;
    state.signupHasCodeChallenge = !!route.request().postDataJSON().code_challenge;
    await route.fulfill({ status: state.signupStatus, json: state.signupStatus === 200 ? state.signupRequiresConfirmation ? fakeUser : session : { code: "over_request_rate_limit", msg: "Private provider information" } });
  });

  // 3. THIRD: Catch ALL network requests and log them (but don't intercept non-API)
  await page.context().route("**", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    // Log ALL requests to help debug
    console.log("[mockOnboarding CATCH-ALL] request:", url, "method:", method);
    // Don't intercept - let it pass through unless it's our API (127.0.0.1:8000 or /api/v1) OR Supabase auth
    const isSupabaseAuth = url.startsWith(supabaseUrl) && url.includes("/auth/v1/");
    if (!url.includes("127.0.0.1:8000") && !url.includes("/api/v1") && !isSupabaseAuth) {
      return route.continue();
    }
    // If it's Supabase auth but wasn't caught by earlier routes, handle it here
    if (isSupabaseAuth) {
      console.log("[mockOnboarding CATCH-ALL] Intercepting Supabase auth:", url);
      const path = new URL(url).pathname;
      if (path.endsWith("/signup")) {
        state.signupCount++;
        fakeUser.user_metadata.display_name = route.request().postDataJSON().data.display_name;
        state.signupHasCodeChallenge = !!route.request().postDataJSON().code_challenge;
        await route.fulfill({ status: state.signupStatus, json: state.signupStatus === 200 ? state.signupRequiresConfirmation ? fakeUser : session : { code: "over_request_rate_limit", msg: "Private provider information" } });
        return;
      }
      if (path.endsWith("/resend")) { state.resendCount++; await route.fulfill({ json: {} }); return; }
      if (path.endsWith("/recover")) { state.recoverCount++; await route.fulfill({ json: {} }); return; }
      if (path.endsWith("/token")) {
        if (new URL(url).searchParams.get("grant_type") === "password") {
          state.passwordCount++;
          if (state.signInError) return route.fulfill({ status: 400, json: { error_code: state.signInError, msg: "Private provider information" } });
        } else state.tokenCount++;
        await route.fulfill({ json: session }); return;
      }
      if (path.endsWith("/user")) {
        if (route.request().method() === "PUT") state.passwordUpdates++;
        await route.fulfill({ json: fakeUser }); return;
      }
      if (path.endsWith("/logout")) {
        state.logoutCount++;
        await route.fulfill(state.logoutStatus === 204 ? { status: 204 } : { status: state.logoutStatus, json: { msg: "Unavailable" } }); return;
      }
      await route.fulfill({ status: 400, json: { error: "unexpected_auth_request" } }); return;
    }
    // Skip chat routes - let test-specific mocks handle them
    if (url.includes("/chat/spaces/")) {
      console.log("[mockOnboarding API] Skipping chat route:", url);
      return route.continue();
    }
    const path = new URL(url).pathname;
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "GET,POST,PATCH,OPTIONS" };
    console.log("[mockOnboarding API] request:", url, "method:", method, "path:", path);
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (!request.headers().authorization?.startsWith("Bearer ")) return route.fulfill({ status: 401, headers, json: { error: { code: "auth_required", message: "Sign in" } } });
    // Strip /api/v1 prefix if present
    const apiPath = path.replace("/api/v1", "");
    if (apiPath === "/auth/bootstrap") {
      console.log("[mockOnboarding API] bootstrap request intercepted!");
      state.bootstrapCount++;
      if (state.bootstrapDelayMs) await new Promise((resolve) => setTimeout(resolve, state.bootstrapDelayMs));
      return route.fulfill({ status: state.bootstrapStatus, headers, json: state.bootstrapStatus === 200 ? { user, is_new: !state.profile } : { error: { code: state.bootstrapStatus === 403 ? "account_suspended" : "account_store_unavailable", message: "Internal details must not appear" } } });
    }
    // NOTE: /chat/spaces/public is mocked by chat-discovery.spec.ts with specific IDs.
    // Only handle it here if no test-specific mock is registered.
    if (apiPath === "/chat/spaces/public") {
      const space = (id: string, name: string, description: string, cover: string) => ({ id, name, description, kind: "community", visibility: "public", avatar_key: cover, cover, is_system: true, member_count: 0, creator_id: null, created_at: timestamp, updated_at: timestamp });
      return route.fulfill({ headers, json: { spaces: [
        space("beekeepers", "Beekeepers", "Hives and honey", "/photos/brood-comb.webp"),
        space("farmers", "General Farmers", "Crops and fieldwork", "/photos/olive-foliage.webp"),
      ] } });
    }
    if (apiPath === "/me") return route.fulfill({ headers, json: user });
    if (apiPath === "/me/chat-profile") {
      if (request.method() === "PATCH") { state.profileWrites++; state.profile = { ...profile, ...request.postDataJSON() }; }
      return route.fulfill({ status: state.profile ? 200 : 404, headers, json: state.profile ?? { error: { code: "profile_not_found", message: "Add profile" } } });
    }
    if (apiPath === "/farms") {
      if (request.method() === "GET") return route.fulfill({ headers, json: { items: [...state.farms.values()], next_cursor: null } });
      const body = request.postDataJSON() as Schema["FarmCreate"];
      if (!state.farms.has(body.client_id)) state.farms.set(body.client_id, { ...body, id: crypto.randomUUID(), created_at: timestamp, updated_at: timestamp });
      return route.fulfill({ status: 201, headers, json: state.farms.get(body.client_id) });
    }
    if (/^\/farms\/[^/]+\/units$/.test(apiPath)) {
      const body = request.postDataJSON() as Schema["UnitCreate"];
      if (!state.units.has(body.client_id)) state.units.set(body.client_id, { ...body, details: body.details ?? {}, id: crypto.randomUUID(), farm_id: path.split("/")[2], created_at: timestamp, updated_at: timestamp });
      if (state.failUnitOnce) { state.failUnitOnce = false; return route.abort("failed"); }
      return route.fulfill({ status: 201, headers, json: state.units.get(body.client_id) });
    }
    return route.fulfill({ status: 500, headers, json: { error: { code: "unexpected_request", message: path } } });
  });
  return state;
}