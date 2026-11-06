# DECISIONS.md

Open decisions from the PRD never block work. Each has a working default. Put the value in configuration so changing it is a settings edit, not a rewrite. When a decision is made, update the row and note the date.

| # | Decision | Working default | Status |
| --- | --- | --- | --- |
| 1 | Phone platform | PWA, works on Android and iPhone browsers. Push on iPhone needs the app added to the home screen (iOS 16.4+). | open |
| 2 | Launch market | Nigeria only, NDPA 2023 | open |
| 3 | Languages | English at launch, all strings through `next-intl` | open |
| 4 | Offline scope | Cached reads, drafts, chat outbox. AI needs a connection. | open |
| 5 | Shared devices | One active Supabase account per browser profile; sign out to switch accounts | open |
| 6 | Pilot crops and bee problems | Configurable list in `api` settings. Seed with hive health, common pests, and 3 to 5 crops chosen by Macaney. | open |
| 7 | Expert review of AI advice | Required before public launch. Add a `reviewed_by` field to any prompt version. | open |
| 8 | Pilot location | Not needed to build | open |
| 9 | Business model | Free for the pilot. No billing code in the MVP. | open |
| 10 | Budget | Cap AI calls per user per day in settings (default 30 scans, 60 questions) | open |
| 11 | First admins | Seed Think Bee admins by farmer ID in a config file. Space admins may appoint moderators and members. They may appoint further space admins. | open |
| 12 | Roles | Think Bee admin, space admin, moderator, member. A verified badge is a later addition. | open |
| 13 | Public communities at launch | Behind a feature flag, off. Invite-only groups first. | open |
| 14 | Moderation staffing | Admin console shows the report queue. Response target is a setting, not enforced in code. | open |
| 15 | Community structure | By place or by topic, both allowed. A community can hold topic rooms. | open |
| 16 | Finding people | By farmer ID. Authentication email is never searchable or public. | open |
| 17 | Chat limits | Voice note 3 minutes, 6 images per message, photo 10 MB before compression (target about 300 KB after), 256 members per group, 5,000 per community. All in settings. | open |
| 18 | Extension officers and cooperatives | May join and host as ordinary members. No dashboards. | open |
| 19 | Message retention | Keep messages while the space exists. On account deletion, show messages as from "Deleted user" and remove the profile. Chat media 90 days after the message is removed. | open |
| 20 | Minimum age for chat | 18. Confirm at sign-up. | open |
| 21 | Chat budget impact | Build chat after AI core. Lighter pilot (direct and private groups) is allowed. | open |

## Engineering decisions

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-11-05 | Next.js PWA with Serwist, FastAPI backend, Postgres, Redis | Requested stack |
| 2026-11-05 | WebSocket for realtime, Web Push for notifications | Fits FastAPI, no extra vendor |
| 2026-11-05 | Not end-to-end encrypted in MVP | PRD requires review team access to reported messages |
| 2026-11-06 | MinIO for the local S3-compatible emulator | Keeps upload development local and matches the storage contract |
| 2026-11-06 | Supabase Auth free tier with email magic links and optional OAuth | Removes paid SMS OTP dependencies and delegates auth sessions, refresh and rate limits |
| 2026-11-06 | Open-Meteo behind `WeatherProvider`, with privacy-cell Redis caching | Provides no-key weather data, controls cost/rate limits, and keeps provider details replaceable |
| 2026-11-06 | Bootstrap uses Postgres uniqueness constraints with conflict-safe inserts; farmer ID collision retries default to 5 | Concurrent sign-ins keep one account and one farmer ID. `FARMER_ID_MAX_ATTEMPTS` and `DEFAULT_LOCALE` are configurable. |
| 2026-11-06 | Save pending account deletion in Postgres and poll with ARQ before calling Supabase Admin | Local private data is removed atomically; provider/Redis outages and browser exit cannot lose the deletion request. Retain a minimal deleted identity tombstone to reject old JWTs. Suspended users may request deletion. Retry timing and batch size are configurable. |
| 2026-11-06 | Owner profile editing in phase 1; avatar assignment and public lookup use later upload/chat work | Onboarding needs display name, bio and deliberate visibility choices now. Accepting unvalidated media keys would bypass ownership and image processing. |
| 2026-11-06 | Farms and units use client IDs, bounded cursor pages and account-row locks for writes | Retries deduplicate existing resources; writes cannot recreate data after deletion. Defaults: 20 farms/account, 200 units/farm, page size 50/max 100, all configurable. |
