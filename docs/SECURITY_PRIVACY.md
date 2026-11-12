# SECURITY_PRIVACY.md

Checklist. Tick before pilot.

## Authentication and sessions
- [ ] Supabase email/password registration with email verification and recovery configured with approved redirect URLs; no social sign-in
- [ ] FastAPI verifies Supabase JWT signature, issuer, audience, expiry and subject through one shared dependency
- [ ] Missing, invalid and expired bearer tokens return stable `401` errors; suspended or deleted local users return `403`
- [ ] The web app delegates token persistence and refresh to `@supabase/supabase-js`; application code never copies tokens into custom storage
- [ ] Supabase service-role key exists only in backend secrets and is never exposed through `NEXT_PUBLIC_*`
- [ ] Optional app lock stored as a hashed PIN on device only

## Data
- [ ] TLS everywhere, database and object storage encrypted at rest
- [ ] Authentication email addresses stay in Supabase Auth and are never exposed in chat profiles or public API responses
- [ ] Exact farm coordinates never in any response to other users
- [ ] EXIF and GPS stripped from all uploads
- [ ] Signed, short-lived media URLs, private buckets
- [ ] Message bodies, email addresses, auth tokens and magic-link URLs never logged
- [ ] Retention jobs for chat media, scan photos and reports per `docs/DECISIONS.md`

## Local app lock

The optional lock in Me is a screen privacy control for one account per browser profile. A six-digit PIN is checked against a random 32-byte salt and a 32-byte PBKDF2/SHA-256 verifier with 600,000 iterations. Only that verifier and local lock metadata are stored; PINs are never sent to the API. Failed attempts and retry deadlines survive reloads, and Web Locks serialize attempts across tabs. Unlock state stays in memory and is not shared between tabs.

Optional platform WebAuthn credentials require user verification. The browser may use fingerprint, face or its device passcode. The app checks the assertion's challenge, origin, RP ID, presence/verification flags, credential ID, user handle and signature against the public key held locally. Biometric data remains with the authenticator. Removing device unlock removes its local association; the operating system may retain the credential in its own settings.

Reload, backgrounding, restored pages, manual locking and the configured idle timeout hide and inert the app. Invalid or blocked lock storage keeps it hidden. Recovery explicitly confirms loss of unsynced drafts, clears the current local account store, signs out through Supabase, and removes the lock only after cleanup succeeds. Future private local stores must join this same cleanup path.

This lock does not encrypt IndexedDB or other browser storage. Someone with browser developer tools, malicious same-origin code or control of the operating system can bypass a local screen gate or attack a copied verifier. Keep the device's screen lock and normal account security enabled. Clearing site data also clears this optional lock.

## Abuse
- [ ] Rate limits on send, upload, search, report
- [ ] File content sniffing, size caps, antivirus or at minimum image re-encode
- [ ] Permission matrix tests for every chat action
- [ ] Admin actions written to `audit_log`
- [ ] User search exposes farmer IDs and public chat-profile fields only

## Nigeria Data Protection Act 2023 review (before launch)
- [ ] Lawful basis and consent screens for photos, location, chat
- [ ] Privacy notice in plain language, in app
- [ ] Data subject rights: access, correction, deletion request in app
- [ ] Retention periods documented, including chat and what happens to messages on account deletion and when a space owner leaves
- [ ] Data processing agreements with Google (Gemini), Supabase, hosting and push
- [ ] Breach response plan
- [ ] Users told that messages are not end-to-end encrypted and may be reviewed when reported
- [ ] Minimum age confirmed at sign-up

## Web
- [ ] CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (camera, microphone self only)
- [ ] Dependency scanning in CI, lockfiles committed
