# TESTING.md

**Dependencies**: install the web app with `npm ci` and run `npm audit --audit-level=moderate`. Install the API on Python 3.12 with `pip install -c requirements.lock -e '.[dev]'`, then run `pip check`. After updating the Python lock, run `pip-audit --disable-pip --no-deps -r requirements.lock` with pip-audit installed. CI repeats both vulnerability scans. Dependency updates must also pass lint, types, unit/database tests, the production build, Home bundle budget and browser tests; the browser job allows 25 minutes for the four viewport/theme projects.

**Backend (Pytest + httpx)**: unit tests for services, API tests per router with a test database, permission matrix tests for every chat role and action, idempotency tests (same `client_msg_id` twice returns one message), Supabase JWT tests (missing, expired, wrong issuer, wrong audience, unknown signing key, suspended local user), user-mapping tests, AI provider tests with a fake provider that returns fixed JSON and one that fails, upload validation tests (wrong type, oversize, spoofed extension), deletion tests.

**Frontend (Vitest + Testing Library + Playwright)**: component tests for primitives, Supabase auth-state and registration/verification/password-recovery UI tests, outbox tests with a fake IndexedDB (queue, retry, order, dedupe), Playwright flows on mobile and desktop viewports: registration, email verification, password sign-in and recovery, first scan to saved record, offline message send then reconnect, voice note send and cancel, share scan to group, admin role change.

**Offline checks**: run Playwright with the network offline and with throttling. Every screen listed in `docs/UI_DESIGN.md` has an offline state test or screenshot.

**Shell startup**: block JavaScript requested after the initial page scripts and verify that appearance controls still initialize and switch themes offline. Also exercise blocked preference storage; do not wait for optional downloads before disconnecting.

**AI safety evals**: a fixed set of sample photos and questions in `api/tests/ai_evals/`. Assertions: result has confidence, likely cause not "confirmed", pollinator warning present when treatment is mentioned, label notice present, no claim about queen status or swarming from a photo, expert referral on serious cases. Run on every prompt change.

**Performance**: Lighthouse CI (PWA, performance, accessibility all 90+, PWA target 100), bundle size check for the home route, test on Android Go class profile (4x CPU slowdown, slow 3G).

**Visual**: screenshot tests for key screens in light and dark at 390 and 1440 widths.

**App lock**: unit checks cover salted PIN verification, durable retry delays, concurrent attempts, stale asynchronous results, damaged storage, WebAuthn data/signature validation and sign-out cleanup order. Browser checks cover setup/change/removal, hidden startup, idle/background/restored pages, multiple tabs, offline unlock and preserved drafts, recovery confirmation/failures, keyboard focus and large text. Chrome's virtual platform authenticator exercises enrollment and assertions, including missing user verification/presence and invalid signatures. Native fingerprint/face/passcode prompts in Safari/iOS and Android installations still need a physical-device check before pilot.

PIN tests retain the production 600,000-iteration hashing cost. The two flows that perform several hashes allow 15 seconds on slower or shared test runners; other unit tests retain the default timeout.
