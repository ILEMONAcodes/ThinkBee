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

First visits open `/welcome`; skipping lets users explore the shell. `/sign-in` starts Supabase email-link authentication, `/auth/callback` exchanges the PKCE code and bootstraps the account, and `/setup/profile` and `/setup/farm` create the initial profile and private farm. Me shows the account/farms, resumes setup and signs out. The welcome marker only controls navigation; it never authorises API access.

Configure the local/staging/production `/auth/callback` URLs in Supabase's redirect allowlist. Open a link in the same browser profile that requested it. A callback sent to the Site URL `/` is forwarded to the callback screen. Existing profile owners return to Home; incomplete or queued setup can be resumed. A missing API, invalid session, expired link, blocked storage or rejected account shows a recoverable state.

Profile and farm edits are saved in IndexedDB before submission. Pending jobs keep client IDs across retries; reconnect and visibility events restart sync. The API URL and Supabase project used for tests must match the build. Browser tests intercept authentication and API requests with synthetic accounts; they never send real sign-in emails. For a live check, run the real API with migrations applied, start this app at the configured origin, and request one link from `/sign-in`. Do not paste tokens or email links into logs or issue descriptions.

Temporary welcome photographs and source credits are in `public/onboarding/`. Profile photos await the server upload pipeline. English, the 200-unit setup cap and optional Google OAuth remain configuration-driven. Full offline page reload still belongs to the next PWA task.
