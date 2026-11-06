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

Protected application routes depend on `require_current_user` from `app.modules.auth.service`. It validates the Supabase identity and loads the local account on every request, rejecting suspended or deleted users. Bootstrap alone depends on `require_authenticated_identity` from `app.core.security`, which validates the signature, algorithm, issuer, audience, expiry, issued-at time, authenticated role and UUID subject. The service-role key is never used to verify browser tokens and must never leave the backend.

Local tests use generated signing keys and do not need a live Supabase project. A deployment smoke test still requires real project values and a magic-link sign-in from an allowed redirect URL.

## Farmer accounts

Run `alembic upgrade head` against the local development database before using account routes. After Supabase sign-in, call `POST /api/v1/auth/bootstrap` with the current access token. It returns `{user, is_new}` and safely handles repeated or concurrent requests. `GET /api/v1/me` checks the current session and account status; `409 auth_bootstrap_required` means the client should bootstrap first.

Farmer IDs use `TB-` plus eight random Crockford base32 characters. Database constraints keep both the Supabase subject and farmer ID unique. `FARMER_ID_MAX_ATTEMPTS` bounds collision retries (default 5); `DEFAULT_LOCALE` defaults to `en-NG`. The API creates no Supabase session and stores no credentials or authentication email.

Postgres integration tests require an explicit `TEST_DATABASE_URL`. They create and clean up a unique schema per test and never fall back to the application's `DATABASE_URL`. Use a dedicated local test database, then run:

```sh
TEST_DATABASE_URL=postgresql+asyncpg://thinkbee:thinkbee@localhost:5432/thinkbee_test pytest
```

Without this variable the database integration tests are skipped; CI supplies a Postgres service and runs them. The suite covers real signed bearer tokens, bootstrap retries and concurrency, farmer ID collisions, suspended/deleted accounts, and migration upgrade/downgrade.
