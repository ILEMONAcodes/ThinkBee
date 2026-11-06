# TESTING.md

**Backend (Pytest + httpx)**: unit tests for services, API tests per router with a test database, permission matrix tests for every chat role and action, idempotency tests (same `client_msg_id` twice returns one message), Supabase JWT tests (missing, expired, wrong issuer, wrong audience, unknown signing key, suspended local user), user-mapping tests, AI provider tests with a fake provider that returns fixed JSON and one that fails, upload validation tests (wrong type, oversize, spoofed extension), deletion tests.

**Frontend (Vitest + Testing Library + Playwright)**: component tests for primitives, Supabase auth-state and magic-link UI tests, outbox tests with a fake IndexedDB (queue, retry, order, dedupe), Playwright flows on mobile and desktop viewports: email magic-link sign-in, first scan to saved record, offline message send then reconnect, voice note send and cancel, share scan to group, admin role change.

**Offline checks**: run Playwright with the network offline and with throttling. Every screen listed in `docs/UI_DESIGN.md` has an offline state test or screenshot.

**AI safety evals**: a fixed set of sample photos and questions in `api/tests/ai_evals/`. Assertions: result has confidence, likely cause not "confirmed", pollinator warning present when treatment is mentioned, label notice present, no claim about queen status or swarming from a photo, expert referral on serious cases. Run on every prompt change.

**Performance**: Lighthouse CI (PWA, performance, accessibility all 90+, PWA target 100), bundle size check for the home route, test on Android Go class profile (4x CPU slowdown, slow 3G).

**Visual**: screenshot tests for key screens in light and dark at 390 and 1440 widths.
