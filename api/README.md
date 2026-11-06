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
