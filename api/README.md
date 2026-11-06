# Think Bee API

FastAPI service for authentication, farms, scans, records, reminders, chat, uploads, push and moderation.

Python 3.12 is required. Copy `../env/api.env.example` to `.env`, then install the development dependencies and run:

```sh
python3.12 -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

Quality checks: `ruff check .`, `mypy app tests`, and `pytest`.
