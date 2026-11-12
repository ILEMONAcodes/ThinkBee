# AGENTS.md — Think Bee (Macaney)

This is the single entry point for any AI coding agent working in this repository. Read it fully before touching anything. Everything else in `docs/` is referenced from here.

## 1. What we are building

Think Bee is a Progressive Web App for farmers and beekeepers in Nigeria. A farmer photographs a crop or a hive, gets plain-language advice from an AI assistant (Google Gemini behind a replaceable layer), keeps records and reminders, and talks to other farmers in direct chats, groups and communities (Telegram-style). The product is built by Macaney. The full requirements are in `docs/PRD.md` and are the source of truth for scope. If this file and the PRD disagree on scope, the PRD wins. If they disagree on engineering, this file wins.

## 2. First-session protocol (do this before writing code)

1. Ask which role you are in: **Frontend**, **Backend**, or **Full-stack (solo)**. Then load the matching file in `agents/` and stay inside that role's folders unless told otherwise. If two developers each run their own agent session, the API contract in `docs/API_SPEC.md` is the only thing the two sides share.
2. Ask whether `assets/` already has everything listed in `docs/ASSET_REQUESTS.md`. If real photos, icons or illustrations are missing, ask for them. Do not invent stock imagery and do not ship placeholder photos of people.
3. Read, in this order: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/UI_DESIGN.md` (frontend and design work), `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/CHAT_SYSTEM.md`, `docs/AI_SAFETY.md`, `docs/PWA_OFFLINE.md`.
4. Check `docs/DECISIONS.md`. Open decisions never block work. Use the stated default, say in one line that you are using it, and keep the value in config so it can change later.
5. Check `docs/ROADMAP.md` for the current phase and pick the next unchecked task. Do one task at a time.

## 3. Fixed stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js (App Router), React, TypeScript (strict) |
| Styling | Tailwind CSS, tokens in `design/tokens.css` |
| Motion | `motion` (Framer Motion) plus CSS and the View Transitions API where supported |
| Client data | TanStack Query for server state, Zustand for UI state, Dexie (IndexedDB) for offline data and the outbox |
| PWA | Serwist service worker, web app manifest, Web Push (VAPID) |
| Forms | React Hook Form with Zod |
| Icons | Phosphor Icons, one weight per context, no emoji as icons |
| Backend | FastAPI (Python 3.12), Pydantic v2, SQLAlchemy 2 (async), Alembic |
| Database | PostgreSQL |
| Cache and pub/sub | Redis |
| Realtime | FastAPI WebSockets, Redis pub/sub for fan-out |
| Files | S3-compatible object storage, upload through presigned URLs |
| AI | Google Gemini through an `AIProvider` interface (`docs/AI_SAFETY.md`) |
| Weather | Open-Meteo through a `WeatherProvider` interface, cached in Redis |
| Auth | Supabase Auth free tier, email/password; email confirmation temporarily disabled for the pilot, recovery remains available; no social sign-in; FastAPI validates Supabase JWTs |
| Tests | Vitest and Playwright (web), Pytest and httpx (api) |
| Local dev | Docker Compose for Postgres, Redis, and an S3 emulator |

Do not add a major dependency that is not listed here without writing a short entry in `docs/DECISIONS.md` first. Prefer the platform (Web APIs, Postgres features) over another package.

## 4. Repository layout

```
/
├─ AGENTS.md  CLAUDE.md  README.md
├─ docs/            requirements, architecture, API, design, safety
├─ agents/          role files (frontend, backend, design, qa)
├─ prompts/         AI system prompt and kickoff prompts
├─ design/          tokens.css, tokens.json, motion.ts (copy into web/)
├─ assets/          brand, inspiration, and files supplied by the team
├─ env/             .env.example files
├─ web/             Next.js PWA
│  ├─ app/          route groups: (onboarding) (main) (admin)
│  ├─ components/   ui/ (primitives), chat/, scan/, records/, shell/
│  ├─ lib/          auth, api client (generated), db (Dexie), outbox, realtime, push
│  ├─ styles/       globals.css (imports design/tokens.css)
│  └─ public/       icons, manifest, offline page
└─ api/             FastAPI service
   ├─ app/
   │  ├─ core/      config, security, logging, rate limits
   │  ├─ modules/   auth, users, farms, scans, assistant, weather, briefings, records, reminders, chat, uploads, push, moderation, admin
   │  ├─ providers/ ai/, weather/, storage/, push/
   │  ├─ db/        models, session, migrations
   │  └─ main.py
   └─ tests/
```

Each backend module holds `router.py`, `schemas.py`, `service.py`, `models.py`. Routers stay thin. Business rules live in `service.py`.

## 5. Non-negotiable rules

**Safety of advice**
- The AI never gives a confirmed diagnosis. It gives likely causes with a stated confidence.
- Any pest treatment suggestion carries a pollinator warning, a label and local-rules reminder, and an expert referral for serious or uncertain cases.
- The AI never claims to detect queen status or swarming from a photo.
- A scan result shared into chat keeps its confidence level and warnings. The card is rendered from the stored result and cannot be edited by the sender.
- The AI does not read group chats, does not post in them, and does not listen to voice notes.
- Nothing is recorded as done unless the farmer confirms it. AI suggests, farmer taps to confirm.
- Weather is context, not proof of a diagnosis. Stale or missing weather is labeled and cannot drive predictive alerts.
- Do not recommend hive inspections during rain, wind above 20 km/h or temperatures below 18°C. Do not recommend spraying within four hours of rain or in high wind.
- Full rules and prompts: `docs/AI_SAFETY.md`, `docs/AI_PROMPTS.md`, `docs/AI_WEATHER_INTEGRATION.md` and `prompts/`.

**Privacy**
- Chat profiles show only what the farmer chose. Authentication email addresses are never shown to other users. Exact farm coordinates are never exposed to other users.
- Strip EXIF and GPS data from every uploaded photo on the server.
- Encrypt in transit and at rest. Never log message bodies, email addresses, auth tokens, photo URLs or exact coordinates.
- Account deletion must remove or anonymise the user's data. Build the deletion path in phase 1, not later.
- Think Bee farmer IDs are internal identifiers, never described as government IDs.

**Offline and weak signal**
- Treat the network as unreliable. Every write the user makes is saved locally first, shown instantly, and synced later.
- Chat messages go through the outbox with a client-generated id so retries never create duplicates.
- Every upload shows a status: queued, uploading, sent, failed with retry.
- Photos are compressed on the device before upload. Voice notes are recorded at a low bitrate.

**Security**
- Supabase Auth owns email/password registration and sign-in, email verification, password recovery, session refresh, token persistence, and authentication rate limits.
- FastAPI accepts `Authorization: Bearer <supabase_token>` and validates the signature, issuer, audience, expiry and subject against the Supabase project JWKS. It never issues or refreshes auth tokens.
- Application code must not copy Supabase access or refresh tokens into its own storage. Use `@supabase/supabase-js` session APIs and keep the service-role key backend-only.
- Every endpoint checks authentication and the caller's role in that space. Role checks live in one place (`modules/chat/permissions.py`).
- Validate file type by content, not by extension. Enforce size caps on the server.
- No secret in the repository. Use `env/*.example` as the template.

## 6. Design rules (summary)

`docs/UI_DESIGN.md` is the law for anything visual. Short version:

- Use only the Macaney palette in `design/tokens.css`. It was taken from the Macaney website. Do not add new hues. Tints and shades of those hues are allowed only through the defined scale.
- The result must not look machine-made. No purple or blue gradients, no sparkle icons, no emoji as decoration, no uniform grids of identical icon-in-circle cards, no generic "Welcome back!" copy.
- Motion is part of the product. Follow the motion section of `docs/UI_DESIGN.md` and use `design/motion.ts`.
- Mobile first, but desktop is a real layout, not a stretched phone.
- Orange is a fill, never body text on a light background.

## 7. Code standards

**Frontend**
- TypeScript strict. No `any` without a comment explaining why.
- Server components by default. Client components only where state, effects or browser APIs are needed.
- API types come from the backend OpenAPI schema (`openapi-typescript`). Do not hand-write response types.
- No component over about 200 lines. Split by responsibility.
- Every screen has loading, empty, error and offline states.
- Touch targets at least 48px. Visible focus rings. Respect `prefers-reduced-motion`.
- Initial JavaScript for the home route under 170 KB gzipped. Lists with more than 50 rows are virtualised. Images use `next/image`, AVIF or WebP.

**Backend**
- Type hints everywhere. `ruff` and `mypy` must pass.
- Async all the way down. No blocking calls in request handlers.
- Pydantic schemas for every request and response. No raw dicts across module boundaries.
- Every schema change ships with an Alembic migration.
- Idempotency: message send, scan upload and sync push accept a client id and return the same result on retry.
- Limits (members per group, images per message, voice note length, photo size) come from settings, not constants.

## 8. Git rules

Full rules in `docs/GIT_WORKFLOW.md`. The important part: **commit messages are written like a developer wrote them**. Short, lowercase, plain. No emoji, no jokes, no references, no marketing words, no "this commit". Example: `chat: queue messages in outbox when offline`. Never add co-author or tool-generated trailers.

## 9. Definition of done

A task is done when all of these are true:
1. It works on a throttled slow connection and with the network switched off where offline behaviour applies.
2. It has loading, empty, error and offline states (frontend) or error codes and validation (backend).
3. Tests cover the behaviour, including the failure path.
4. Lint, type check and tests pass.
5. The UI matches `docs/UI_DESIGN.md` in light and dark mode at 390px and 1440px.
6. `docs/ROADMAP.md` is ticked and any new decision is in `docs/DECISIONS.md`.
7. The commit message follows `docs/GIT_WORKFLOW.md`.

## 10. When you are unsure

- Product question: check the PRD, then `docs/DECISIONS.md`. If still open, take the safer and simpler option, note it in one line, and continue.
- Safety question about AI output or chat moderation: choose the more cautious behaviour.
- Design question: choose what makes the farmer's next action more obvious.
- Never silently expand scope. Anything under "Not in the MVP" in the PRD stays out.
