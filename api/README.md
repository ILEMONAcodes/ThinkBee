# Think Bee API

FastAPI service for authentication, farms, scans, records, reminders, chat, uploads, push and moderation.

Supabase Auth owns sign-in and sessions. The API accepts Supabase bearer tokens, maps their `sub` claim to a local user and never issues authentication tokens itself. Keep `SUPABASE_SERVICE_ROLE_KEY` backend-only.

Python 3.12 is required. Copy `../env/api.env.example` to `.env`, then install the development dependencies and run:

```sh
python3.12 -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

Quality checks: `ruff check .`, `mypy app tests`, and `pytest`.

Export the current OpenAPI schema with `python scripts/export_openapi.py --output openapi.json`.

## Supabase Auth

Create or select a Supabase project, enable the Email provider, and configure the app's production and local magic-link redirect URLs in the Supabase Auth URL settings. The browser owns sign-in and session refresh through `@supabase/supabase-js`; this API only verifies access tokens.

Set `SUPABASE_URL` to the project URL. `SUPABASE_JWT_ISSUER` normally stays empty so it derives as `<SUPABASE_URL>/auth/v1`, and `SUPABASE_JWT_AUDIENCE` defaults to `authenticated`. The verifier fetches asymmetric signing keys from the project's JWKS endpoint, caches them briefly, and refreshes once when a token references an unknown key ID.

Protected routes depend on `require_authenticated_identity` from `app.core.security`. It validates the signature, algorithm, issuer, audience, expiry, issued-at time, authenticated role and UUID subject. The service-role key is never used to verify browser tokens and must never leave the backend.

Local tests use generated signing keys and do not need a live Supabase project. A deployment smoke test still requires real project values and a magic-link sign-in from an allowed redirect URL.
