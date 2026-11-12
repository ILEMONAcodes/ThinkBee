# Think Bee API

FastAPI service for authentication, farms, scans, records, reminders, chat, uploads, push and moderation.

Supabase Auth owns sign-in and sessions. The API accepts Supabase bearer tokens, maps their `sub` claim to a local user and never issues authentication tokens itself. Keep `SUPABASE_SERVICE_ROLE_KEY` backend-only.

Python 3.12 is required. Copy `../env/api.env.example` to `.env`, then install the development dependencies and run:

```sh
python3.12 -m venv .venv
. .venv/bin/activate
pip install -c requirements.lock -e '.[dev]'
uvicorn app.main:app --reload
```

Quality checks: `ruff check .`, `mypy app tests`, and `pytest`.

`requirements.lock` pins runtime and development dependencies across supported platforms. Use it as constraints for both `pip install -c requirements.lock .` (production) and the editable development command above; production does not install the optional test tools. To refresh the lock with uv installed, run `uv pip compile pyproject.toml --extra dev --universal --python-version 3.12 -o requirements.lock`, then run the full checks and `pip-audit --disable-pip --no-deps -r requirements.lock`. CI audits both the Python lock and the npm lock on every run.

Export the current OpenAPI schema with `python scripts/export_openapi.py --output openapi.json`.

## Supabase Auth

Create or select a Supabase project, enable the Email provider with email confirmation, and configure the app's production and local `/auth/callback` URLs in the Supabase Auth redirect allowlist. The browser owns email/password sign-in, verification, recovery and session refresh through `@supabase/supabase-js`; this API only verifies access tokens. No social sign-in is used.

Set `SUPABASE_URL` to the project URL. `SUPABASE_JWT_ISSUER` normally stays empty so it derives as `<SUPABASE_URL>/auth/v1`, and `SUPABASE_JWT_AUDIENCE` defaults to `authenticated`. The verifier fetches asymmetric signing keys from the project's JWKS endpoint, caches them briefly, and refreshes once when a token references an unknown key ID.

Protected application routes depend on `require_current_user` from `app.modules.auth.service`. It validates the Supabase identity and loads the local account on every request, rejecting suspended or deleted users. Bootstrap alone depends on `require_authenticated_identity` from `app.core.security`, which validates the signature, algorithm, issuer, audience, expiry, issued-at time, authenticated role and UUID subject. The service-role key is never used to verify browser tokens and must never leave the backend.

Local tests use generated signing keys and do not need a live Supabase project. A deployment smoke test still requires real project values, registration, verification through an allowed redirect URL, password sign-in and password recovery.

## Farmer accounts

Run `alembic upgrade head` against the local development database before using account routes. After Supabase sign-in, call `POST /api/v1/auth/bootstrap` with the current access token. It returns `{user, is_new}` and safely handles repeated or concurrent requests. `GET /api/v1/me` checks the current session and account status; `409 auth_bootstrap_required` means the client should bootstrap first.

Farmer IDs use `TB-` plus eight random Crockford base32 characters. Database constraints keep both the Supabase subject and farmer ID unique. `FARMER_ID_MAX_ATTEMPTS` bounds collision retries (default 5); `DEFAULT_LOCALE` defaults to `en-NG`. The API creates no Supabase session and stores no credentials or authentication email.

Postgres integration tests require an explicit `TEST_DATABASE_URL`. They create and clean up a unique schema per test and never fall back to the application's `DATABASE_URL`. Use a dedicated local test database, then run:

```sh
TEST_DATABASE_URL=postgresql+asyncpg://thinkbee:thinkbee@localhost:5432/thinkbee_test pytest
```

Without this variable the database integration tests are skipped; CI supplies a Postgres service and runs them. The suite covers real signed bearer tokens, bootstrap retries and concurrency, farmer ID collisions, suspended/deleted accounts, and migration upgrade/downgrade.

## Profiles, farms and deletion

After migrating, `PATCH /api/v1/me` edits language preferences. `GET/PATCH /api/v1/me/chat-profile` manages the owner's display name, bio, area and visibility choices. Avatar keys cannot be assigned until the validated upload pipeline is implemented. Public profile lookup and blocking remain in the chat phase.

Farm and unit CRUD routes are listed in `docs/API_SPEC.md`. Creates require a caller-generated `client_id` UUID for retries. Lists use bounded cursor pagination; farms and exact saved pins are visible only to their owner. A hive belongs to a bee/mixed farm and a crop block to a crop/mixed farm. Every authenticated write holds the account lock until commit so deletion cannot race with a new write.

`DELETE /api/v1/me` removes local profile and farm data, immediately disables the local account, and persists a deletion job. It returns `202` with a pending/completed status. **Run the worker alongside the API** to finish Supabase deletion:

```sh
arq app.worker.WorkerSettings
```

The worker needs the same database settings as the API, Redis, and the backend-only Supabase service-role key. It checks pending jobs each minute and retries failures with bounded backoff. Jobs survive Redis/worker restarts; no browser session is required. Tests mock the Supabase Admin endpoint and never delete a live account. Do not start the worker against a live environment merely to run tests.

An already-deleted Supabase user completes the job; arbitrary provider errors remain pending. Monitor overdue rows in `account_deletions` and fix configuration/provider issues if requests remain pending. Log only status/error codes, never profile data, keys or provider response bodies. The frontend must clear local data and its Supabase session after deletion is accepted. As later features add private data, extend `users/deletion_service.py` and its tests before enabling them.
