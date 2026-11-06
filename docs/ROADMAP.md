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
- [ ] BE: users, farms, farm units (hives, crop blocks), account deletion
- [ ] FE: app shell, floating nav, desktop rail, theme switch
- [ ] FE: onboarding (splash, welcome, email/magic link auth, profile, add farm)
- [ ] FE: PWA manifest, service worker, offline page, install prompt
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
