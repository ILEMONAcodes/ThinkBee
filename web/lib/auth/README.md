# Supabase authentication plan

Think Bee uses Supabase Auth on the free tier. Email magic links are the launch method; OAuth providers may be enabled through configuration later.

## Client flow

1. Create one browser client with `@supabase/supabase-js` using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Replace the planned six-digit SMS screen with an email form. Submit with `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`; the product copy calls this a sign-in link, not an OTP.
3. Show the check-email, resend cooldown, expired-link and returning-from-link states described in `docs/UI_DESIGN.md`. If an OAuth provider is enabled, start it with `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })`.
4. After Supabase establishes the session, call `POST /api/v1/auth/bootstrap` with `Authorization: Bearer <access_token>` to create or fetch the local user and farmer ID.
5. Subscribe to `supabase.auth.onAuthStateChange` so the shell reacts to sign-in, refresh and sign-out. Use `supabase.auth.signOut()` for logout.

## Session rules

- Supabase owns token persistence, refresh and authentication rate limits.
- Think Bee code must not copy access or refresh tokens into Zustand, Dexie, localStorage, cookies or another custom store.
- The generated API client obtains the current session from the Supabase client and attaches the access token as a bearer header immediately before a request.
- The WebSocket sends the current access token in its first `auth` event and reconnects after a token refresh.
- Sign-in, link exchange and OAuth require a network connection. Existing offline data stays readable, but protected network actions wait until the session can be validated.
- The service-role key is never included in the web environment or bundle.
