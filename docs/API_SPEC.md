# API_SPEC.md

Base: `/api/v1`. JSON. Authenticated requests use `Authorization: Bearer <supabase_token>`. Errors:

```json
{ "error": { "code": "auth_invalid_token", "message": "Your session is not valid. Sign in again.", "fields": {} } }
```

`message` is always plain language, safe to show. FastAPI generates the OpenAPI schema; this file lists the intended surface. If code and this file differ, fix the file in the same PR.

The generated OpenAPI document defines an HTTP bearer security scheme with `bearerFormat: JWT` and applies it to protected operations. Health endpoints and any future public metadata endpoints explicitly opt out.

Health endpoints are outside `/api/v1`: `GET /health/live` returns `200 {status: ok}` when the process runs. `GET /health/ready` checks database connectivity and the user/profile schema without fetching farmer data. It returns `200 {status: ready}` or `503 account_store_unavailable`; its deadline is `READINESS_TIMEOUT_SECONDS` (default 5). Database connections have a separate `DATABASE_CONNECT_TIMEOUT_SECONDS` deadline (default 10).

The web account bootstrap and initial profile read allow `NEXT_PUBLIC_ACCOUNT_TIMEOUT_SECONDS` (default 90, range 15–180) for an idle API to wake. Ordinary writes retain their 15-second deadline. Startup timeouts and service/database failures have separate feedback from offline failures; retry keeps the SDK session and uses the idempotent bootstrap route.

## Authentication and security
Supabase Auth handles name/email/password registration, email/password sign-in, password recovery, session persistence, refresh and authentication rate limits. Pilot registration temporarily skips email confirmation and returns the farmer to sign-in; Supabase Confirm email must be off. Passwords are sent only to Supabase; the FastAPI contract is unchanged. The Think Bee API does not send OTPs, set auth cookies, issue JWTs, refresh sessions or expose logout endpoints. The SDK's existing PKCE callback remains available for recovery and older verification links.

Every protected FastAPI route uses one shared auth dependency. It reads the bearer token, validates its signature against the Supabase project JWKS, and checks `iss`, `aud`, `exp` and `sub`. The dependency maps `sub` to `users.supabase_user_id`, rejects missing, invalid or expired tokens with `401`, and rejects suspended or deleted local users with `403`. JWKS may be cached with a short TTL, but a signing-key miss triggers one refresh before rejection.

The verifier accepts only configured asymmetric signing algorithms and the Supabase `authenticated` role; it never verifies browser tokens with the service-role secret. Authentication errors use `auth_required`, `auth_invalid_token` or `auth_token_expired` and include `WWW-Authenticate: Bearer`. A temporary JWKS/provider failure returns `503 auth_verifier_unavailable` rather than treating a valid user as signed out.

- `POST /auth/bootstrap` (authenticated, idempotent) -> maps the Supabase user to a local user, creates the unique farmer ID on first use, returns `{user, is_new}`
- `DELETE /me` -> starts account deletion

Implemented foundation routes:
- `POST /auth/bootstrap` returns `200 {user, is_new}`. It takes no request body. First use creates a UUIDv7 account and a `TB-` plus eight-character Crockford base32 farmer ID; retries and concurrent requests return the same account. Only the request that creates it returns `is_new: true`. Clients cannot set account IDs, roles or status.
- `GET /me` validates the Supabase token and the current local account status, then returns the same `user` shape. An unmapped Supabase user receives `409 auth_bootstrap_required` and must call bootstrap first.
- The private account response contains `id`, `farmer_id`, `status`, `is_think_bee_admin`, `locale`, `last_seen_at`, `created_at` and `updated_at`. It contains no email, Supabase subject, token or session credentials. `last_seen_at` is initialized at account creation; tracking later activity is not implemented yet.
- Both routes reject suspended/deleted accounts with `403 account_suspended` / `account_deleted`. They return `503 account_store_unavailable` for a temporary database failure; bootstrap may return `503 farmer_id_unavailable` after exhausting the configured collision retries. Retrying bootstrap after a lost response is safe.

Application routes use `require_current_user`. Bootstrap and account deletion use the lower-level `require_authenticated_identity`: bootstrap creates a first-time mapping, while deletion accepts retries for deleted accounts and lets suspended users remove their data. All writes lock the current account row until commit so a concurrent deletion cannot be followed by a new farm or profile write. The account summary is not a public chat profile.

## Me and profiles
- `GET /me`, `PATCH /me`
- `GET /me/chat-profile`, `PATCH /me/chat-profile`
- `GET /users/{farmer_id}` (public chat profile only)
- `GET /users/search?q=` (farmer ID)
- `POST /blocks/{user_id}`, `DELETE /blocks/{user_id}`, `GET /blocks`

Implemented owner profile operations:
- `PATCH /me` accepts `{locale}` from `SUPPORTED_LOCALES` (default `en-NG`) and returns the private account summary. Identity, status and admin fields are not editable.
- `GET /me/chat-profile` returns `404 profile_not_found` until the owner creates it.
- `PATCH /me/chat-profile` creates or updates the owner's profile. `display_name` is required on creation. Editable fields: `display_name` (1–80 characters), `bio` (up to 280), `area_state`, `area_lga`, `show_crops` and `show_hive_type`. Display name and bio cannot be null; an empty bio clears it. Setting both area fields to null hides the area. LGA requires a state. Visibility flags default to false and farm details are never copied into this profile automatically.
- Profile responses contain those fields plus `photo_key`, `created_at`, `updated_at`; they contain no email, identity subject or exact coordinates. Avatar assignment awaits the validated upload pipeline, so clients cannot submit `photo_key` yet. Public profile lookup, search and blocking remain phase 4 work.
- All input objects reject unknown fields. Empty patches and invalid values return `422` using the shared error envelope, without echoing submitted values.

Account deletion:
- `DELETE /me` takes no body and returns `202 {status: pending|completed, requested_at, completed_at}`. It always targets the bearer token's account; clients cannot supply another user's ID.
- The first request atomically marks the local account deleted, clears profile/preferences and private farms/units, and saves an `account_deletions` job. The minimal identity tombstone prevents old tokens from recreating the account. Normal application routes immediately reject the old account.
- Retries return the same deletion request. A suspended account can request deletion; an unmapped identity receives `409 auth_bootstrap_required`. A failed local transaction returns a retryable error and leaves the account/data intact.
- The ARQ worker polls durable pending jobs each minute and deletes the Supabase Auth user using the backend credential after local cleanup commits. Timeouts, missing configuration, rejected credentials and provider failures remain pending with capped exponential retry. A Supabase `user_not_found` error is treated as an already-completed deletion; other errors do not imply success.
- The frontend must show confirmation before calling DELETE and clear its local private data and Supabase session after acceptance. The worker continues without the browser or a valid session. Future chat, scan, media and reminder modules must extend local cleanup before they ship.

## Farms
- `GET/POST /farms`, `GET/PATCH/DELETE /farms/{id}`
- `GET/POST /farms/{id}/units`, `PATCH/DELETE /units/{id}`

Implemented farm operations are owner-only, including for admins. Missing and other users' IDs both return `404 farm_not_found` / `unit_not_found` without revealing existence or coordinates.

- `POST /farms` accepts `{client_id: UUID, name, kind: crops|bees|both, state?, lga?, lat?, lng?}`. Name is 1–120 characters; LGA requires a state. A private saved pin must supply both valid coordinates or neither. The submitted pin reflects the farmer's permission; no location is inferred.
- `PATCH /farms/{id}` accepts name, kind and location fields. Omitted fields stay unchanged. Coordinates must be changed or cleared together. Changing farm kind is rejected with `409 farm_kind_conflict` if existing units are incompatible.
- `POST /farms/{id}/units` accepts `{client_id: UUID, name, kind: hive|crop_block, details?}`. A hive belongs to `bees` or `both`; a crop block belongs to `crops` or `both`. `details` accepts `hive_type` for hives, or `crop` and positive `area_hectares` for crop blocks. Unknown or incompatible details are rejected.
- `PATCH /units/{id}` accepts name and details; an included details object replaces the prior details (`{}` clears it). Unit kind, farm, owner and client ID cannot be changed.
- Creates return `201` with the saved object, including its UUIDv7 ID, client ID and timestamps. Units include `farm_id`. Retrying an existing client ID in the same owner/farm scope returns the stored object without applying the retry's fields. Concurrent creation is serialized with account deletion and capacity checks. Caps default to 20 farms per user and 200 units per farm; retries still succeed at the cap.
- `GET /farms` and `GET /farms/{id}/units` accept `cursor` (UUID) and `limit`. Responses are `{items, next_cursor}` ordered by ID; the final page has a null cursor. Default page size is 50, maximum 100, configurable. `GET /farms/{id}` returns the farm, with exact coordinates only to its owner.
- Deletes return `204`; deleting a farm cascades to its units. A retry for an absent item returns `404`, which a deletion outbox can treat as already removed. Creation retries are deduplicated while the resource exists; clients must process a resource's writes in order and discard pending creates after a confirmed deletion.

## Scans and assistant
- `POST /uploads/presign` {purpose: scan|chat_image|chat_audio|avatar, content_type, bytes} -> {upload_url, key}
- `POST /scans` {subject, farm_id?, unit_id?, image_keys[], note?, client_id} -> 202 {id, status}
- `GET /scans/{id}` -> result when done. `GET /scans` paginated.
- `POST /scans/{id}/followup` {answers or extra_image_keys}
- `POST /assistant/threads`, `GET /assistant/threads`
- `POST /assistant/threads/{id}/messages` {text, image_keys?} -> SSE stream
- `POST /assistant/messages/{id}/feedback` {value: up|down}

Scan result shape:
```json
{
  "task": "scan_analysis",
  "status": "completed|needs_clarification|refused|unavailable",
  "likely_causes": [{"name": "string", "confidence": "low|medium|high", "reasoning": "string"}],
  "overall_confidence": "low|medium|high",
  "observations": ["string"],
  "weather_relevance": "string|null",
  "needs_better_photo": false,
  "better_photo_hint": null,
  "follow_up_questions": ["string"],
  "next_steps": ["string"],
  "protective_gear_warning": "string|null",
  "pollinator_warning": "string|null",
  "label_notice": "string",
  "expert_referral": "string|null",
  "suggested_record": {"title": "string", "type": "string"},
  "refusal": null,
  "disclaimer_version": "1"
}
```

The authoritative AI output schemas, refusal objects and examples are in `docs/AI_PROMPTS.md`.

## Weather and daily briefings

Both routes are authenticated. The server verifies that the selected farm belongs to the caller. Exact device coordinates are accepted only in the redacted `X-ThinkBee-Latitude` and `X-ThinkBee-Longitude` request headers; they must never appear in access logs, analytics, response bodies or AI context. If those headers are absent, the server uses the selected farm's saved pin, then its State/LGA.

- `GET /weather/current?farm_id={uuid}` -> current localized weather plus the next 24–48 hours from the cache/provider layer.
- `GET /briefings/daily?farm_id={uuid}&date={YYYY-MM-DD}` -> the saved or generated briefing for the farm's local date. `date` defaults to today and cannot request an unbounded historical range.

Full paths are `GET /api/v1/weather/current` and `GET /api/v1/briefings/daily`.

Weather response:

```json
{
  "status": "live|cached|stale|unavailable",
  "location": {"source": "device_gps|saved_pin|state_lga|none", "label": "Ibadan North, Oyo", "precision": "two_decimals|administrative_area|none"},
  "observed_at": "2026-11-06T08:00:00+01:00",
  "expires_at": "2026-11-06T09:30:00+01:00",
  "temperature_c": 28.4,
  "humidity_percent": 84,
  "rain_probability_next_4h_percent": 70,
  "rain_probability_next_24h_percent": 85,
  "wind_speed_kmh": 13,
  "wind_direction": "SW",
  "forecast_hours": [{"at": "2026-11-06T09:00:00+01:00", "temperature_c": 29.1, "humidity_percent": 82, "rain_probability_percent": 65, "wind_speed_kmh": 14, "wind_direction": "SW"}],
  "limitations": []
}
```

Unavailable numeric fields are `null`; they are never guessed. A stale response includes the original observation time and a plain-language limitation. Cache freshness and provider rules are defined in `docs/AI_WEATHER_INTEGRATION.md`.

Daily briefing response:

```json
{
  "task": "daily_briefing",
  "status": "ready|limited|unavailable",
  "local_date": "2026-11-06",
  "location_label": "Ibadan North, Oyo",
  "weather_summary": "Warm and humid, with rain likely this afternoon.",
  "priorities": [{"title": "Check field drainage", "reason": "Rain may be heavy.", "timing": "Before rain", "source_task_id": null}],
  "pest_risks": [{"name": "Conditions may favour fungal growth", "level": "medium", "reason": "Humidity and temperature cross the threshold on consecutive forecast days.", "action": "Inspect leaves for visible signs."}],
  "hive_advice": "Wait for a dry, calm period before opening the hives.",
  "postponed_tasks": [],
  "alerts": [],
  "limitations": [],
  "refusal": null,
  "generated_at": "2026-11-06T06:00:00+01:00",
  "prompt_version": "daily_briefing:1",
  "weather_observed_at": "2026-11-06T05:45:00+01:00"
}
```

The domain portion follows `DailyBriefingOutput` in `docs/AI_PROMPTS.md`; API metadata is added by the server. `limited` is returned when weather is missing or stale but non-weather priorities can still be shown. `unavailable` is returned when no useful briefing can be produced. Generating a briefing does not mark any reminder or record as done.

## Records, reminders, sync
- `GET/POST /records`, `PATCH/DELETE /records/{id}`, `POST /records/from-scan/{scan_id}` (farmer confirms)
- `GET/POST /reminders`, `PATCH/DELETE /reminders/{id}`, `POST /reminders/{id}/done|postpone|dismiss`
- `POST /sync/push` {changes: [{table, op, client_id, data, updated_at}]} -> per item result
- `GET /sync/pull?since=` -> changes

## Chat
- `GET /chats` -> spaces the user is in with last message and unread
- `POST /chats/direct` {user_id | farmer_id}
- `POST /spaces` (Think Bee admin only) {kind, name, description, visibility, parent_space_id?}
- `GET/PATCH /spaces/{id}`, `POST /spaces/{id}/join` {invite_code?}, `POST /spaces/{id}/leave`
- `GET /spaces/{id}/members`, `PATCH /spaces/{id}/members/{user_id}` {role} (space admin or Think Bee admin), `DELETE /spaces/{id}/members/{user_id}`
- `POST /spaces/{id}/members/{user_id}/mute` {minutes}
- `POST /spaces/{id}/rooms` (space admin) topic room
- `GET /spaces/{id}/messages?before_seq=&after_seq=&limit=`
- `POST /spaces/{id}/messages` {client_msg_id, kind, body?, media_keys?, reply_to_id?, scan_id?} -> idempotent
- `DELETE /messages/{id}`
- `POST /spaces/{id}/pins` {message_id}, `DELETE /spaces/{id}/pins/{message_id}`
- `POST /spaces/{id}/read` {seq}
- `PATCH /spaces/{id}/me` {muted: bool, rules_accepted: bool}
- `POST /reports` {target_type, target_id, reason, note?}

## Push
- `POST /push/subscribe`, `DELETE /push/subscribe`

## Admin (Think Bee admin)
- `GET /admin/reports`, `POST /admin/reports/{id}/action`
- `POST /admin/users/{id}/suspend`, `POST /admin/spaces/{id}/close`
- `GET /admin/audit`

## WebSocket `/ws`
The browser sends an `auth` event containing the current Supabase access token immediately after opening the socket. The server validates it with the same JWT verifier before subscribing the connection to any user or space channels. No other client event is accepted before authentication.

Server events: `message.new`, `message.deleted`, `message.receipt`, `typing`, `presence`, `member.joined`, `member.removed`, `role.changed` (also stored as a system message), `space.updated`, `pin.changed`, `scan.ready`.
Client events: `auth` {access_token}, `typing.start|stop`, `read` {space_id, seq}, `resume` {spaces: [{id, last_seq}]}, `ping`.
Every event carries `id` and `space_id` where relevant. Messages are never created through the socket; always through REST, so idempotency and permission checks have one path.

## Limits (all configurable)
`MAX_VOICE_SECONDS`, `MAX_IMAGES_PER_MESSAGE`, `MAX_IMAGE_BYTES`, `MAX_GROUP_MEMBERS`, `MAX_COMMUNITY_MEMBERS`, `SCANS_PER_DAY`, `QUESTIONS_PER_DAY`.
