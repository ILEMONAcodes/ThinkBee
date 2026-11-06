# PWA_OFFLINE.md

## Manifest
Name "Think Bee", short name "Think Bee", `display: standalone`, `theme_color` `#022C22`, `background_color` `#FAFAFA`, start URL `/`, icons 192 and 512 plus maskable, shortcuts: Scan, Chats, Records. `lang` en-NG.

## Install
Show the install card in Me after the user has done something meaningful (first saved scan or first message), never on first launch. Android: use `beforeinstallprompt`. iPhone: show a short guided sheet ("Share, then Add to Home Screen"). On iPhone, Web Push works only after the app is installed (iOS 16.4+).

## Service worker (Serwist)
- Precache the shell, fonts, offline page, icons.
- Runtime: images stale-while-revalidate with size and age limits; API reads network-first with timeout and fallback to local Dexie data; never cache auth routes; signed media URLs cached only for their lifetime.
- Update flow: new worker waits, app shows "Update available", applies on user tap or next cold start.
- Push handler shows notification, click focuses an existing window and routes to the room.

## Offline behaviour
| Area | Offline |
| --- | --- |
| Open app, see Home, Records, Reminders | yes, from local data |
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
- Storage: request persistent storage (`navigator.storage.persist()`) after install to reduce eviction.
