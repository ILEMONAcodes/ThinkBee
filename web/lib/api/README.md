# API client

Run the backend schema exporter, then `npm run generate:api` from `web/`. The generated `schema.d.ts` is intentionally ignored and recreated in CI so generated files do not enter Git history.

`npm run generate:mocks` creates MSW handlers, a Node server, a browser worker setup, and an operation manifest from the same schema under `web/mocks/generated/`.
