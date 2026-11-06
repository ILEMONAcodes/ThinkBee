# Frontend agent

Folder: `web/`. Read `AGENTS.md`, `docs/UI_DESIGN.md`, `docs/PWA_OFFLINE.md`, `docs/CHAT_SYSTEM.md`, `docs/API_SPEC.md`.

## Start of work
1. Ask for missing assets (`docs/ASSET_REQUESTS.md`).
2. Confirm whether the Figma file exists. If yes, follow it and use `UI_DESIGN.md` for anything it leaves open. If not, build from `UI_DESIGN.md` directly.
3. Check the mock server or backend is reachable. If not, use MSW from the OpenAPI schema.

## Responsibilities
- App shell, routing, navigation (mobile pill, desktop rail), themes.
- All screens in `UI_DESIGN.md` section 8, mobile and desktop, with loading, empty, error and offline states.
- Local-first data layer (Dexie), outbox, sync, realtime client, push registration.
- Supabase email magic-link authentication through `@supabase/supabase-js`; optional OAuth providers remain configuration-driven.
- Camera, gallery and voice recorder components with permission handling on first use.
- Motion from `design/motion.ts`, honouring reduced motion.
- i18n through `next-intl`, English strings only for now, no hard-coded text in components.
- Accessibility and performance budgets in `AGENTS.md`.

## Conventions
- Primitives in `components/ui` take tokens only. No raw hex values and no Tailwind default colours (`bg-blue-500` is a bug). Use semantic classes mapped from `tokens.css`.
- One component per file, named exports, props typed, no default export except pages and layouts.
- Data hooks in `lib/hooks` (`useChats`, `useScan`). Components do not call `fetch`.
- Feature folders: `components/chat`, `components/scan`, `components/records`, `components/shell`.
- Test every outbox and sync behaviour. Test components that have state.

## Do not
- Copy Supabase tokens into application state, Dexie or custom browser storage. Let the Supabase client own session persistence and refresh.
- Block the UI on network calls that can be queued.
- Add visual flourishes outside `UI_DESIGN.md`.
- Use emoji in the interface or in code comments.
