# Supabase browser authentication

`client.ts` creates the one browser client with PKCE, SDK-owned persistence and automatic refresh. Application state holds only the user ID and readiness. The API client obtains the SDK session immediately before a request and never copies access/refresh tokens into application storage.

`actions.ts` requests email links and explicitly exchanges the callback code once. Codes and provider error descriptions are cleared from the address bar before rendering results. A callback on the Site URL is forwarded to `/auth/callback`; request and callback must use the same browser profile. Network retries retain the code only in memory. Expired/used links need a new email.

Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` and the deployment's `/auth/callback` redirect allowlist in Supabase. The browser refuses known backend key formats. The redirect always uses the current origin; a stale environment value cannot send the link to another origin. Google OAuth is optional and hidden unless `NEXT_PUBLIC_AUTH_OAUTH_PROVIDERS=google`; it must also be configured in Supabase.

Supabase owns authentication rate limits. The email screen adds a 60-second resend cooldown, email validation and explicit age confirmation. Authentication requires connectivity. Profile/farm setup works from account-scoped local drafts after initial account bootstrap. Sign-out clears setup drafts and the SDK session; unsynced draft removal requires confirmation.

The browser suite mocks Supabase transport and uses synthetic SDK session fixtures. Live email delivery/callback checks use a separately supplied test address and must never commit an email link, session token or browser storage dump.
