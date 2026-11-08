# PWA_OFFLINE.md

## Manifest
Name "Think Bee", short name "Think Bee", `display: standalone`, `theme_color` `#022C22`, `background_color` `#FAFAFA`, start URL `/`, icons 192 and 512 plus maskable, shortcuts: Scan, Chats, Records. `lang` en-NG.

## Install
Show the install card in Me after the user has done something meaningful (first saved scan or first message), never on first launch. Android: use `beforeinstallprompt`. iPhone: show a short guided sheet ("Share, then Add to Home Screen"). On iPhone, Web Push works only after the app is installed (iOS 16.4+).

## Service worker (Serwist)
- Precache the shell, fonts, offline page, icons.
- Runtime: public same-origin images, including safe `next/image` requests, use stale-while-revalidate with entry and age limits. Pages and RSC reads have a four-second response deadline and use cached content on network failure or server errors; uncached navigations fall back to the offline page.
- Authenticated requests and API reads stay network-only, with private offline data read from account-scoped Dexie (see `DECISIONS.md`). Never cache auth routes, callback parameters or signed media URLs, including signed sources inside image-optimizer URLs. Activation removes old private entries from application runtime caches.
- Update flow: new worker waits, app shows "Update available", applies on user tap or next cold start.
- Reconnecting does not reload the page: disable Serwist's `reloadOnOnline` so connectivity events cannot interrupt navigation or lose unsynced form input. Feature listeners resume sync. The offline screen's recovery link uses a full document navigation to the precached Home page.
- Push handler shows notification, click focuses an existing window and routes to the room.

## Offline behaviour
| Area | Offline |
| --- | --- |
| Sign in, exchange a magic link, recover a session | no, clear connection message; already cached local data remains readable when safe |
| Open app, see Home, Records, Reminders | yes, from local data |
| See weather and daily briefing | show only an unexpired cached snapshot/briefing; otherwise show a clear unavailable-offline state |
| Create or edit log entries and reminders | yes, drafts sync later |
| Read loaded chats | yes |
| Write chat messages and attach photos or voice notes | yes, queued in outbox |
| Scan, Ask Think Bee | queued scan is allowed, answer arrives when online. Ask Think Bee requires connection and says so. |
| Search people, join spaces, admin actions | no, clear message |

## Sync
- Local writes carry `client_id` and `updated_at`. `POST /sync/push` is idempotent. Conflicts: last write wins per field for records, server wins for roles and membership. Surface conflicts that lose data to the user.
- Triggers: `online` event, app open, visibility change, every 60s while visible. iOS has no Background Sync, so do not depend on it. Use it as an enhancement on Chromium.

## Weak signal
- Detect connection quality (`navigator.connection` where available, plus request timing). Low data mode reduces image quality, stops media prefetch.
- Resumable uploads per part. Show per-item status.

## Platform notes
- Camera: `getUserMedia` for in-app capture; fall back to `<input type="file" accept="image/*" capture>`.
- Microphone: ask on first voice note. Safari records `audio/mp4`; others `audio/webm;codecs=opus`. Feature-detect with `MediaRecorder.isTypeSupported`.
- Vibration is not available on iPhone; treat haptics as optional.
- Request permissions only when the feature is first used. Denial must leave the rest of the app working.
- Location: request on first use of the weather feature. Offer the saved farm location as fallback and never infer location from IP address or photo metadata.
- Storage: request persistent storage (`navigator.storage.persist()`) after install to reduce eviction.
