# Think Bee web app

Next.js App Router PWA for Think Bee. Node.js 24 and npm 11 are required. Copy `../env/web.env.example` to `.env.local`, then run:

```sh
npm ci
npm run dev
```

Quality checks:

```sh
npm run lint
npm run typecheck
npm test
npm run build -- --webpack
npm run check:bundle
npx playwright install chromium
npm run test:e2e
```

Webpack is the verified production-build path on hosts where Turbopack cannot create its required process/port. The bundle check requires a completed build and rejects initial Home JavaScript at or above 170 KB gzipped. Browser tests start the production server on port 3100 and cover mobile/desktop light and dark layouts, keyboard navigation, reduced motion, offline settings, denied storage, slow network/CPU and enlarged text. Screenshots and failure traces go to ignored `test-results/`; CI retains them for seven days. With Chrome already installed locally, use `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` instead of installing Chromium.

The app shell uses floating navigation below 768px and an expandable, pinnable rail on larger screens. Scan and nested chat routes hide shell navigation. Appearance follows the device by default; choose a theme in Me or cycle it with the theme button. Theme and rail preferences persist locally and theme follows device changes while in system mode.

Home currently shows empty sections; scans, records and chats are connected in later roadmap tasks. The offline band and appearance controls work on an already loaded page. Offline reload, cached pages, installation and the service worker belong to the subsequent PWA task.

Authentication uses `@supabase/supabase-js` with email magic links. See `lib/auth/README.md`; the browser receives only the Supabase URL and publishable key.

After exporting `../api/openapi.json`, run `npm run generate:api` to create the ignored TypeScript schema at `lib/api/schema.d.ts`.

Run `npm run generate:mocks` to create schema-driven MSW handlers for Node and the browser. Run `npx msw init public --save` once after installing dependencies to create the ignored browser worker.
