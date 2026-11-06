# Think Bee web app

Next.js App Router PWA for Think Bee. Node.js 24 and npm 11 are required. Copy `../env/web.env.example` to `.env.local`, then run:

```sh
npm ci
npm run dev
```

Quality checks: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

Authentication uses `@supabase/supabase-js` with email magic links. See `lib/auth/README.md`; the browser receives only the Supabase URL and publishable key.

After exporting `../api/openapi.json`, run `npm run generate:api` to create the ignored TypeScript schema at `lib/api/schema.d.ts`.

Run `npm run generate:mocks` to create schema-driven MSW handlers for Node and the browser. Run `npx msw init public --save` once after installing dependencies to create the ignored browser worker.
