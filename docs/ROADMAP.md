# ROADMAP.md

Tick tasks as they are finished. One task at a time. Frontend (FE) and backend (BE) tasks can run in parallel against `docs/API_SPEC.md`.

## Phase 0: Setup
- [x] Repo, `web/` Next.js app, `api/` FastAPI app, Docker Compose (Postgres, Redis, S3 emulator)
- [x] Tokens, fonts, Tailwind wiring (`design/tokens.css`), motion presets
- [x] CI: lint, type check, tests on both sides
- [x] OpenAPI to TypeScript client generation
- [x] MSW mock server from the OpenAPI schema

## Phase 1: Foundation
- [x] BE: Supabase Auth setup (Email / Magic Link), token verification middleware
- [x] BE: farmer ID generation, Supabase user mapping and session validation
- [x] BE: users, farms, farm units (hives, crop blocks), account deletion
- [x] FE: app shell, floating nav, desktop rail, theme switch
- [x] FE: onboarding (splash, welcome, email/magic link auth, profile, add farm)
- [x] FE: PWA manifest, service worker, offline page, install prompt
- [x] FE: prevent reconnect reloads from interrupting offline fallback navigation; recover through cached Home
- [ ] FE: app lock (PIN or biometrics where available)

## Phase 2: AI core
- [ ] BE: `AIProvider` interface and Gemini implementation, structured scan output, prompt versioning
- [ ] BE: scan endpoint with image handling (EXIF strip, resize), assistant thread endpoint with streaming
- [ ] BE: safety post-checks (required warning fields, confidence present)
- [ ] BE: WeatherProvider interface, OpenMeteo implementation, Redis geohash caching
- [ ] BE: Location-aware context builder for Gemini prompts (GPS + Farm location + Weather)
- [ ] BE: Daily briefing generator endpoint & automated morning alerts
- [ ] FE: scan flow (pick, capture, review, analysing, result)
- [ ] FE: Ask Think Bee thread, feedback actions
- [ ] FE: Location permission modal & current weather widget on Home screen
- [ ] FE: Daily briefing card on Home screen
- [ ] AI unavailable state

## Phase 3: Records and reminders
- [ ] BE: records, sync push and pull, reminders and actions
- [ ] FE: timeline, entry detail, manual entry, drafts that sync
- [ ] FE: reminders list, swipe actions, create sheet, local notifications and push

## Phase 4: Community chat
- [ ] BE: chat profiles, blocks, direct chats
- [ ] BE: spaces (groups, communities, topic rooms), roles, permissions module, system messages
- [ ] BE: messages, receipts, WebSocket gateway, Redis fan-out, presence and typing
- [ ] BE: uploads (presign, validation, EXIF strip, thumbnails), voice note limits
- [ ] BE: reports, mutes, moderator actions, admin console endpoints
- [ ] BE: push delivery
- [ ] FE: chat list, direct room, group and community room
- [ ] FE: outbox with idempotent retry, upload status states
- [ ] FE: camera and gallery send, voice note recorder, scan share card
- [ ] FE: space info, admin tools, rules screen, report and block flows
- [ ] FE: desktop three-pane chat
- [ ] Admin console (desktop)

## Phase 5: Pilot readiness
- [ ] Performance pass on throttled network and CPU
- [ ] Accessibility pass (screen reader, large text)
- [ ] Security review, NDPA checklist in `docs/SECURITY_PRIVACY.md`
- [ ] Expert review of AI prompts and sample outputs
- [ ] Moderation process review
- [ ] Analytics for the success measures in the PRD (privacy-safe)
- [ ] Pilot build, feedback loop, fixes

## Handoff — 2026-11-06

Supabase project URLs and key roles match. Live read-only checks passed for the publishable key, email provider, asymmetric JWKS and backend admin credential. Magic-link delivery and callback redirects still need a real browser sign-in during onboarding.

Implemented `POST /auth/bootstrap`, `GET /me`, UUIDv7 local accounts, unique farmer IDs, retry/concurrency handling and a shared active-account guard. The initial users migration was tested forward and backward in an isolated Postgres schema; run `alembic upgrade head` against the local app database before using these routes. No migration was applied to the configured app database in this session.

Validation: 29 API tests and 7 web tests passed; both lint/type checks and OpenAPI/type/mock generation passed. Local API checks used the existing Python 3.11 environment and Postgres 18; CI is configured for the required Python 3.12 and Postgres 17, with database integration tests enabled.

Next: users/profile editing, farms, farm units and account deletion. Working defaults: English (`en-NG`), one active Supabase account per browser profile, five configurable farmer-ID collision attempts. Full-stack role confirmed; some assets are missing and the team permits temporary online assets for future UI work.

## Handoff — profiles, farms and account deletion (2026-11-06)

Implemented owner profile/preferences editing; private farm and hive/crop-block CRUD; validated locations/details; client-ID creation retries; bounded pagination and configurable capacity limits. The owner-only profile supports onboarding now; avatar assignment and public profiles remain with the upload/chat work.

Account deletion atomically removes current profile and farm/unit data, disables the local identity and saves a durable job. The ARQ worker performs Supabase hard deletion after local cleanup, retrying provider failures. Account-row locks prevent a concurrent write from recreating deleted data. Later modules must add their data/media cleanup to this path before being enabled.

Validation: 75 API tests and 7 web tests passed, with lint/type checks, migration upgrade/downgrade, worker import, OpenAPI export and frontend type/mock generation. Tests used isolated Postgres schemas and mocked Supabase deletion; no live account or configured app database was modified. Local runtime remains Python 3.11/Postgres 18; CI targets Python 3.12/Postgres 17.

To use locally: apply `alembic upgrade head`, then run `arq app.worker.WorkerSettings` alongside the API with Redis and backend Supabase configuration. Defaults: English, 20 farms/account, 200 units/farm, pages of 50 (maximum 100), deletion polling each minute and configurable retries. Next roadmap task: FE app shell, floating navigation, desktop rail and theme switch.

## Handoff — app shell and themes (2026-11-07)

Pushed `api/farms-account-deletion` to origin, then implemented the shell on `web/app-shell`. Mobile has floating five-tab navigation with a raised Scan button; tablet/desktop has a keyboard-accessible rail that expands on hover/focus and can stay pinned. Scan and nested chat routes hide the shell navigation. Added a skip link, loading/error boundaries and an offline band.

Appearance defaults to the device theme, supports live device changes and light/dark overrides, and persists theme/rail preferences locally. Blocked storage leaves controls usable. Replaced fabricated Home activity with empty sections and corrected the shared font bindings and text colours. No new imagery was needed; no Figma file was supplied, so the shell follows `UI_DESIGN.md`.

CI follow-up: the mobile failure was the page-width assertion before the Records click. The 24px entrance translation temporarily widened the 390px page to 414px. The main region now clips horizontal animation overflow while retaining vertical scrolling. A regression test pauses real entrances and checks page width at 0%, 50% and 99% on Home and Records in all four viewport/theme projects; the existing navigation assertion remains intact.

Validation: lint, TypeScript, 16 unit tests, a production Webpack build and 20 Chrome browser tests passed. Browser checks covered 390px/1440px in light/dark, tablet rail pinning, keyboard navigation, reduced motion, offline settings, denied storage, 400ms network latency, 4x CPU throttling and 200% text size. Reviewed all four Home screenshots. Initial Home JavaScript is 168.1 KB gzipped against the 170 KB limit; the check and browser suite now run in CI. Turbopack remains blocked by this host's process/port restrictions; Webpack is the verified fallback.

Next: FE onboarding (splash, welcome, Supabase email/magic link auth, profile, add farm), including live callback/sign-in validation. Full offline reload and service-worker caching remain with the following PWA task; this shell only handles offline status and preferences on an already loaded page.

## Handoff — onboarding (2026-11-07)

Pushed `web/app-shell` to origin, then implemented onboarding on `web/onboarding`: logo splash, three welcome panels with temporary credited photos, email links with resend cooldown, explicit PKCE callback handling, profile preview, optional farm setup with hive/crop units, account/farm display in Me and sign-out. Profiles and farm locations use the existing owner-only API contract. Avatar uploads remain with the upload pipeline; no permissions are requested before a feature needs them.

Profile/farm drafts are saved locally before network writes. Submitted jobs retain client IDs and resume after reload/reconnect, including partial farm/unit success. Sign-out asks before discarding unsynced drafts and clears the private setup cache. App code never persists Supabase credentials. Theme controls wait for initialization so slow-load clicks are not lost. Home stays at 168.7 KB gzipped.

Validation: lint, TypeScript, 31 unit tests, production Webpack build and 48 Chrome browser checks passed (44 shell/onboarding checks plus four sign-out confirmation checks). Coverage includes direct/root callbacks, stale links, API failures, blocked storage, interrupted requests, offline drafts, light/dark at 390px and 1440px, keyboard/tablet behavior, slow network, 4x CPU and 200% text. Reviewed onboarding screenshots. CI now generates API types/mocks before building the web app.

Live validation: Supabase accepted one email-link request to the supplied test address with HTTP 200. The test window returned to Home, but no local account was created in the isolated database at the last check; the live callback remains unverified. Root callbacks are now handled and tested with mocks. Confirm the deployed origin's `/auth/callback` URL in Supabase's redirect allowlist and open the email link in the same browser that requested it. No test address, link, token or session dump is committed.

The live API used a separate local `thinkbee_onboarding` database on the existing test Postgres cluster (port 55439), with the existing migrations applied; the configured app database was not changed. Local preview uses port 3000 with API port 8000. Next roadmap task: FE PWA manifest, service worker, offline page and install prompt. Full offline reload remains unimplemented until that task.

CI fix validation: the animation regression reproduced 414px overflow on the 390px viewport in both mobile themes before the CSS fix. After the fix, lint, TypeScript, 31 unit tests, the production Webpack build and all 52 Chrome browser checks passed, including the new animation checks and existing Records navigation. Reviewed all four Home screenshots; Home JavaScript remains 168.7 KB gzipped. Both profile-preview `break-words` classes now use Tailwind's canonical `wrap-break-word`. PWA work has not started.

## Handoff — PWA and Think Bee brand kit (2026-11-07)

Implemented the installable PWA: manifest and shortcuts, supplied standard/maskable/Apple/notification icons, a Serwist worker, offline navigation fallback, bounded image/page caches, waiting-worker update notice, push notification routing and persistent-storage request after installation. Authenticated requests, auth routes and API reads are never placed in service-worker caches; local feature data continues to belong in Dexie.

Me now shows the browser install card only after a saved scan or sent message calls `markPwaMeaningfulUse`; Android/Chromium uses `beforeinstallprompt`, while iPhone shows Safari Share → Add to Home Screen guidance. Those qualifying scan/chat actions land in later phases, so tests seed the marker for now. Offline Home reload and the standalone offline page work in production. Product-facing Macaney logo uses were replaced with the supplied Think Bee wordmark and short mark; the Macaney PNG remains available for creator attribution.

Validation: lint, TypeScript, 41 unit tests, production Webpack/Serwist build, bundle check and all 60 Chrome browser checks passed at 390px/1440px in light and dark. Browser coverage includes install dismissal, manifest/icons, service-worker control, cached Home reload and offline fallback. Reviewed the updated onboarding and Home screenshots. Initial Home JavaScript is 169.989 KB gzipped against the 170 KB limit. On this nearly full workstation the final build used `NEXT_DISABLE_WEBPACK_CACHE=1`; the option only disables disposable Webpack cache and does not change the application output.

Next roadmap task: FE app lock (PIN or biometrics where available).

Follow-up audit: service-worker startup had depended on the Me route client chunk being loaded or prefetched. It now starts from the global shell, while the heavier PWA runtime is deferred to keep Home below budget. The document captures early `beforeinstallprompt` events so the Me install card does not miss them. Added a fresh-Home regression test that blocks Me loading. Validation: lint, type check, 42 unit tests, production Webpack/Serwist build, 169,997 bytes of initial Home JavaScript and 12 targeted Chrome PWA checks across mobile/desktop and light/dark.

## Handoff — PWA verification and deployment fixes (2026-11-07)

Fixed all seven audit findings: every production build selects Webpack; callback parameters and signed image sources stay out of runtime caches; worker activation removes old private cache entries; optimized public images remain available offline; page/RSC requests have a four-second response deadline and recover from server errors; already-installing workers show the update notice; the offline recovery action has its required styling; and install errors show feedback with a retry path while single-use prompts cannot be submitted twice.

Fixed clean deployment builds by generating ignored API types before build, type check and dev startup from the versioned FastAPI contract snapshot in `web/lib/api/openapi.json`. CI exports the backend independently and checks the snapshot for drift. This resolves the missing-schema errors and the consequent implicit `any` on farm rows. TypeScript declarations, mocks and service workers remain generated and ignored. Browser API mocks now cover service-worker requests, and lint ignores generated browser reports.

Validation: production build passed with `schema.d.ts` removed beforehand; lint, type check, 66 unit tests, the Home bundle budget and all 88 Chrome browser checks passed. Browser coverage includes real proxy-injected outages and stalled requests, callback/signed-image cache exclusions, worker updates and cache cleanup, optimized-image offline recovery, install rejection/retry, and onboarding/shell regressions in light/dark at 390px and 1440px. Native installation on physical Android/iPhone devices remains a manual check; qualifying scan/message actions remain in their later roadmap phases.
