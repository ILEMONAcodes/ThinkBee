# Think Bee

Think Bee is Macaney's PWA for farmers and beekeepers in Nigeria. The monorepo contains a Next.js web app, a FastAPI service, product and engineering specifications, shared design tokens, and local infrastructure.

## Local setup

Requirements: Node.js 24, npm 11, Python 3.12, and Docker with Compose.

1. Copy `env/web.env.example` to `web/.env.local` and `env/api.env.example` to `api/.env`.
2. Start PostgreSQL, Redis, and MinIO with `docker compose up -d`.
3. In `web/`, run `npm ci` and `npm run dev`.
4. In `api/`, create a Python 3.12 virtual environment, install `.[dev]`, and run `uvicorn app.main:app --reload`.

Read `AGENTS.md` before making changes. The current build order is tracked in `docs/ROADMAP.md`.

## Contents

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | Master instructions for any agent |
| `docs/PRD.md` | Product requirements v2 with community chat |
| `docs/ARCHITECTURE.md` | System design |
| `docs/UI_DESIGN.md` | Full visual and interaction design brief |
| `docs/FIGMA_PROMPT.md` | Paste-ready prompt for Figma |
| `docs/API_SPEC.md` | REST and WebSocket contract |
| `docs/DATA_MODEL.md` | Database tables |
| `docs/CHAT_SYSTEM.md` | Chat rules, roles, outbox, moderation |
| `docs/AI_SAFETY.md` | Gemini layer and advice rules |
| `docs/PWA_OFFLINE.md` | Service worker, offline, push, platform limits |
| `docs/SECURITY_PRIVACY.md` | Security and NDPA checklist |
| `docs/TESTING.md` | Test strategy |
| `docs/GIT_WORKFLOW.md` | Branches, commits, PRs |
| `docs/DECISIONS.md` | Open decisions and working defaults |
| `docs/ROADMAP.md` | Phase checklists |
| `docs/ASSET_REQUESTS.md` | What the team must supply |
| `agents/` | Role files |
| `web/` | Next.js App Router PWA |
| `api/` | FastAPI service |
| `design/` | Source design tokens and motion presets |
| `prompts/` | AI system prompt and kickoff prompts |
| `assets/` | Logo, palette reference, inspiration screens |
