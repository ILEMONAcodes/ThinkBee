# SECURITY_PRIVACY.md

Checklist. Tick before pilot.

## Authentication and sessions
- [ ] OTP 6 digits, 5 minute expiry, hashed, single use, max 5 attempts, per phone and per IP rate limits
- [ ] SMS provider behind interface, no OTP in logs
- [ ] httpOnly, Secure, SameSite cookies, CSRF header on unsafe methods
- [ ] Refresh token rotation with reuse detection, device list, sign out everywhere
- [ ] Optional app lock stored as a hashed PIN on device only

## Data
- [ ] TLS everywhere, database and object storage encrypted at rest
- [ ] Phone numbers encrypted, lookups by keyed hash
- [ ] Exact farm coordinates never in any response to other users
- [ ] EXIF and GPS stripped from all uploads
- [ ] Signed, short-lived media URLs, private buckets
- [ ] Message bodies, phone numbers, tokens never logged
- [ ] Retention jobs for chat media, scan photos, reports, OTPs per `docs/DECISIONS.md`

## Abuse
- [ ] Rate limits on send, upload, search, report
- [ ] File content sniffing, size caps, antivirus or at minimum image re-encode
- [ ] Permission matrix tests for every chat action
- [ ] Admin actions written to `audit_log`
- [ ] Search by phone respects `discoverable_by_phone`

## Nigeria Data Protection Act 2023 review (before launch)
- [ ] Lawful basis and consent screens for photos, location, chat
- [ ] Privacy notice in plain language, in app
- [ ] Data subject rights: access, correction, deletion request in app
- [ ] Retention periods documented, including chat and what happens to messages on account deletion and when a space owner leaves
- [ ] Data processing agreements with Google (Gemini), SMS, hosting, push
- [ ] Breach response plan
- [ ] Users told that messages are not end-to-end encrypted and may be reviewed when reported
- [ ] Minimum age confirmed at sign-up

## Web
- [ ] CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (camera, microphone self only)
- [ ] Dependency scanning in CI, lockfiles committed
