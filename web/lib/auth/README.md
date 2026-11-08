# Supabase browser authentication

`client.ts` creates the browser singleton with PKCE, SDK-owned persistence and automatic refresh. Application state holds only the user ID and readiness. The API client reads the SDK session before requests; application code never copies tokens into its own storage.

Registration collects name, email, password, confirmation and explicit age consent. `actions.ts` calls Supabase `signUp` with the name and age confirmation as user metadata. Email confirmation must stay enabled in Supabase. The one-time email link uses `/auth/callback`; the requesting browser exchanges the PKCE code, scrubs the URL and continues to profile/farm setup. The registration name is only a suggestion for the farmer-confirmed public profile.

Returning users use `signInWithPassword`. No social providers or passwordless sign-in buttons are exposed. Unconfirmed users can resend verification through `resend({ type: "signup" })` without resubmitting their password. Resend and password-recovery requests have a 60-second UI cooldown; Supabase enforces authentication rate limits.

Forgot password uses `resetPasswordForEmail` with the same allowed callback URL. The SDK’s `PASSWORD_RECOVERY` event routes to `/auth/reset-password`, where `updateUser` saves the new password. Both new-password fields require matching values and at least eight characters; Supabase remains authoritative for password policy. Existing users can sign in with older passwords without being blocked by the new-password minimum.

Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` and the deployed `/auth/callback` redirect allowlist. The redirect always uses the current origin. The public auth settings were checked on 2026-11-07: email enabled, sign-up allowed, email autoconfirm disabled. No auth provider settings were changed.

Authentication requires connectivity. Forms keep credentials only in memory and clear passwords after successful submission. Profile/farm drafts are account-scoped and local-first. Sign-out clears drafts and SDK session data, asking before discarding unsynced work.

Browser tests mock Supabase transport with synthetic credentials and exercise registration, verification, password login, recovery, provider failures and offline handling. Live delivery and browser-link validation need a separately supplied test address; never commit email links, tokens or storage dumps.
