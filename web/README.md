# Think Bee web app

Next.js App Router PWA for Think Bee. Node.js 24 and npm 11 are required. Copy `../env/web.env.example` to `.env.local`, then run:

```sh
npm ci
npm run dev
```

Quality checks: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

After exporting `../api/openapi.json`, run `npm run generate:api` to create the ignored TypeScript schema at `lib/api/schema.d.ts`.
