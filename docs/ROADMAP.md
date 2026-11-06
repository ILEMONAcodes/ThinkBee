# ROADMAP.md

Tick tasks as they are finished. One task at a time. Frontend (FE) and backend (BE) tasks can run in parallel against `docs/API_SPEC.md`.

## Phase 0: Setup
- [x] Repo, `web/` Next.js app, `api/` FastAPI app, Docker Compose (Postgres, Redis, S3 emulator)
- [x] Tokens, fonts, Tailwind wiring (`design/tokens.css`), motion presets
- [x] CI: lint, type check, tests on both sides
- [x] OpenAPI to TypeScript client generation
- [x] MSW mock server from the OpenAPI schema

## Phase 1: Foundation
- [ ] BE: phone OTP request and verify, rate limits, SMS provider interface
- [ ] BE: farmer ID generation, JWT access and rotating refresh in cookies
- [ ] BE: users, farms, farm units (hives, crop blocks), account deletion
- [ ] FE: app shell, floating nav, desktop rail, theme switch
- [ ] FE: onboarding (splash, welcome, phone, OTP, profile, add farm)
- [ ] FE: PWA manifest, service worker, offline page, install prompt
- [ ] FE: app lock (PIN or biometrics where available)

## Phase 2: AI core
- [ ] BE: `AIProvider` interface and Gemini implementation, structured scan output, prompt versioning
- [ ] BE: scan endpoint with image handling (EXIF strip, resize), assistant thread endpoint with streaming
- [ ] BE: safety post-checks (required warning fields, confidence present)
- [ ] FE: scan flow (pick, capture, review, analysing, result)
- [ ] FE: Ask Think Bee thread, feedback actions
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
