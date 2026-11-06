# ARCHITECTURE.md

## Overview

```
Browser (PWA: Next.js, Serwist SW, Dexie)
   |  Supabase Auth (email magic link / optional OAuth)
   |  HTTPS REST + SSE with Bearer JWT     |  WebSocket auth event (chat)
   v                                       v
FastAPI (api/)  ---- Redis (pub/sub, app rate limits, presence)
   |    |
   |    +---- Providers: Gemini (AI), Web Push, S3 storage
   v
PostgreSQL
```

## Frontend structure

- App Router with route groups: `(onboarding)`, `(main)` (tabs), `(admin)` (desktop console).
- Server components for static shells and data that does not need the browser. Client components for chat, scan, recorder, outbox.
- **Local-first layer** in `lib/db`: Dexie tables `drafts`, `records`, `reminders`, `chats`, `messages`, `outbox`, `media_queue`, `sync_state`. UI reads from Dexie through live queries and TanStack Query hydrates it from the server. Writes go to Dexie first.
- **Outbox worker** in `lib/outbox`: processes queued items in order per chat, with backoff, triggered on reconnect, app open, and visibility change (iOS has no background sync).
- **Realtime** in `lib/realtime`: one WebSocket per session with heartbeat and resume from last seen event id. Falls back to polling every 15 seconds when sockets fail.
- **Generated API client** from OpenAPI. Errors map to a single `AppError` type with a plain-language message.
- **Authentication** through `@supabase/supabase-js`. Supabase owns magic-link/OAuth flows, token persistence, refresh and auth rate limits. The API client reads the current session and attaches the access token as a bearer header without copying it into application state or custom storage.
- **Service worker** (Serwist): precache app shell, runtime cache for images (stale while revalidate), network first for API reads with offline fallback, no caching of authenticated chat media URLs beyond their signed lifetime. Handles Web Push display and click routing.

## Backend structure

Modular monolith. Modules own their tables and expose services. Cross-module calls go through services, never through another module's models.

- `auth`: Supabase JWT verification, local user mapping, session validation
- `users`: accounts, farmer ID, chat profile, privacy settings, blocks
- `farms`: farms and units (hives, crop blocks)
- `scans`: image intake, calls `AIProvider`, stores structured result
- `assistant`: threads and messages with the AI, streaming
- `records`: records, drafts, sync
- `reminders`
- `chat`: spaces, memberships, roles, messages, receipts, mutes, pins, gateway
- `uploads`: presign, validation, processing jobs (EXIF strip, resize, thumbnail, audio probe)
- `push`: subscriptions and delivery
- `moderation`: reports, actions, audit log
- `admin`: Think Bee admin endpoints

Background work: `arq` (Redis) workers for media processing, push delivery and retention jobs. Scheduled jobs: reminder dispatch and retention clean-up.

## Authentication design

- The web app signs users in with Supabase email magic links. OAuth providers may be enabled later through configuration without adding backend auth endpoints.
- FastAPI never accepts a Supabase service-role key from the browser and never issues or refreshes user tokens.
- One dependency verifies bearer tokens with the Supabase JWKS and validates issuer, audience, expiry and subject. It maps the `sub` claim to `users.supabase_user_id`.
- `POST /auth/bootstrap` creates the local user and farmer ID once, then returns the same mapping on retries.
- Account deletion removes or anonymises local data first, then deletes the Supabase Auth user through a backend-only service-role call.

## Realtime design

- Client connects to `/ws`, immediately sends the current Supabase access token in an `auth` event, and may send no other event until the server validates it. The server then loads memberships and subscribes to Redis channels `space:{id}` and `user:{id}`.
- Messages are persisted first, then published. Each message has a monotonically increasing `seq` per space for ordering and resume.
- Typing and presence are ephemeral (Redis only, short TTL).
- On reconnect the client sends `last_seq` per open space and receives the missed range through REST (`GET /spaces/{id}/messages?after_seq=`).

## AI layer

`providers/ai/base.py` defines `AIProvider` with `analyze_scan`, `answer_question`, `stream_answer`. `gemini.py` implements it. Prompt text lives in `prompts/` and is versioned. Scan output is validated against a Pydantic schema; invalid output is retried once, then returned as a "could not analyse" result with a clear reason. A post-check enforces safety fields (see `docs/AI_SAFETY.md`). The app keeps working if the provider is down.

## Environments

Local (Docker Compose), staging, production. Config by environment variables (`env/*.example`). Health endpoints `/health/live` and `/health/ready`. Structured JSON logs with request id. Errors reported to Sentry with PII scrubbing.
