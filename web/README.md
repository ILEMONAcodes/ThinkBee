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
npm run build
npm run check:bundle
npm audit
npx playwright install chromium
npm run test:e2e
```

`npm run build` explicitly uses Webpack so local, CI and Docker builds all generate the Serwist worker. The bundle check requires a completed build and rejects initial Home JavaScript at or above 170 KB gzipped. Browser tests start the production server on port 3100 and cover mobile/desktop light and dark layouts, keyboard navigation, reduced motion, offline settings, denied storage, slow network/CPU and enlarged text. Screenshots and failure traces go to ignored `test-results/`; CI retains them for seven days. With Chrome already installed locally, use `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` instead of installing Chromium.

The app shell uses floating navigation below 768px and an expandable, pinnable rail on larger screens. Scan and nested chat routes hide shell navigation. Appearance follows the device by default; choose a theme in Me or cycle it with the theme button. Theme and rail preferences persist locally and theme follows device changes while in system mode.

Home currently shows empty sections; scans, records and chats are connected in later roadmap tasks. The Serwist worker precaches the shell and offline page, caches visited pages and bounded same-origin images, and keeps authenticated/API responses out of browser caches. Offline Home reload and the standalone fallback page are covered by browser tests.

Authentication uses `@supabase/supabase-js` for name/email/password registration, email verification, password sign-in and recovery. See `lib/auth/README.md`; the browser receives only the Supabase URL and publishable key.

Builds, type checks and development startup automatically generate the ignored TypeScript schema at `lib/api/schema.d.ts` from the committed `lib/api/openapi.json` contract snapshot. A frontend-only deployment needs Node.js, not the Python backend. CI checks the snapshot against a fresh FastAPI export; update it with `python scripts/export_openapi.py --output ../web/lib/api/openapi.json` from `api/` whenever the backend contract changes.

Run `npm run generate:mocks` to create schema-driven MSW handlers for Node and the browser. Run `npx msw init public --save` once after installing dependencies to create the ignored browser worker.

Docker builds exclude local environment files. Pass public configuration at build time with `--build-arg NEXT_PUBLIC_API_URL=...`, `--build-arg NEXT_PUBLIC_SUPABASE_URL=...` and `--build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`. Next.js embeds these values in browser bundles; setting them only when starting a built image cannot configure authentication. The Dockerfile also accepts the optional public settings in `env/web.env.example`. Never pass the Supabase service-role key to the web build.

First visits open `/welcome`; skipping lets users explore the shell. `/register` creates the Supabase account and requests email verification; `/sign-in` accepts the saved password. `/auth/callback` exchanges the verification code and bootstraps the account, and `/setup/profile` and `/setup/farm` create the initial profile and private farm. `/forgot-password` requests a recovery link whose callback opens `/auth/reset-password`. Me shows the account/farms, resumes setup and signs out. The welcome marker only controls navigation; it never authorises API access.

Configure the local/staging/production `/auth/callback` URLs in Supabase's redirect allowlist. Open a link in the same browser profile that requested it. A callback sent to the Site URL `/` is forwarded to the callback screen. Existing profile owners return to Home; incomplete or queued setup can be resumed. A missing API, invalid session, expired link, blocked storage or rejected account shows a recoverable state.

Profile and farm edits are saved in IndexedDB before submission. Pending jobs keep client IDs across retries; reconnect and visibility events restart sync. The API URL and Supabase project used for tests must match the build. Browser tests intercept authentication and API requests with synthetic accounts; they never send real emails. For a live check, run the real API with migrations applied, start this app at the configured origin, register a test account at `/register`, open its verification link in the same browser, and then check password sign-in and recovery. Do not paste tokens or email links into logs or issue descriptions.

Temporary welcome photographs and source credits are in `public/onboarding/`. Product UI and install surfaces use the supplied Think Bee brand kit in `public/brand/` and `public/icons/`; the Macaney logo remains a separate parent-brand asset. Profile photos await the server upload pipeline. English and the 200-unit setup cap remain configuration-driven. Registration uses name, email and password with email verification; returning users sign in with their password. No social sign-in is shown.

The install card in Me follows `docs/PWA_OFFLINE.md`: a saved scan or sent message must call `markPwaMeaningfulUse` before the card can appear. Chromium uses the deferred install event; iPhone shows Add to Home Screen instructions. If local disk space is tight, `NEXT_DISABLE_WEBPACK_CACHE=1 npm run build` skips only the disposable Webpack cache.
