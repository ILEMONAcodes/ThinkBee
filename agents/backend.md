# Backend agent

Folder: `api/`. Read `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/CHAT_SYSTEM.md`, `docs/AI_SAFETY.md`, `docs/SECURITY_PRIVACY.md`.

## Responsibilities
- Modules listed in `docs/ARCHITECTURE.md`, built in the order of `docs/ROADMAP.md`.
- Keep the OpenAPI schema accurate and documented. The frontend generates its client from it. Give every route a `summary`, typed request and response models and error codes.
- Providers behind interfaces: AI, weather, storage and push. A fake implementation for each, used in tests and local dev. Authentication is Supabase Auth; FastAPI validates its JWTs and does not wrap it in a custom provider.
- Permission logic only in `modules/chat/permissions.py` and equivalent single places per module.
- Background jobs with `arq`. Retention and reminder dispatch as scheduled jobs.
- Seed scripts: Think Bee admins from config, sample spaces for development.

## Conventions
- Routers thin, services hold logic, models and schemas separate.
- Alembic migration for every schema change, reversible where possible.
- Idempotency keys on message send, scan creation and sync push.
- Settings class (`pydantic-settings`) for every limit and secret.
- Log with request id. Never log bodies, email addresses, auth tokens, magic-link URLs or media URLs.
- Return plain-language `message` strings in errors, stable `code` values.
- Keep exact coordinates out of logs and AI context. Apply `docs/AI_WEATHER_INTEGRATION.md` thresholds in deterministic code, not only in prompts.

## Do not
- Put business rules in routers.
- Create chat messages through the WebSocket.
- Expose exact coordinates or authentication email addresses of other users.
- Let AI output reach a user without the post-check in `docs/AI_SAFETY.md`.
