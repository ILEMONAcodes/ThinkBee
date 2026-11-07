# API client

`openapi.json` is the versioned contract snapshot exported from FastAPI. Frontend builds, type checks and development startup generate the ignored `schema.d.ts` from this snapshot automatically, including on Node-only hosts and in Docker. Do not hand-edit the snapshot or generated types.

After changing the backend contract, run `python scripts/export_openapi.py --output ../web/lib/api/openapi.json` from `api/`, then `npm run generate:api` from `web/`. CI independently exports FastAPI's schema and compares it with the committed snapshot to catch drift.

`npm run generate:mocks` creates MSW handlers, a Node server, a browser worker setup, and an operation manifest from the same schema under `web/mocks/generated/`.
