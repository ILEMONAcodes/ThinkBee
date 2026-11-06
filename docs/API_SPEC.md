# API_SPEC.md

Base: `/api/v1`. JSON. Authenticated requests use `Authorization: Bearer <supabase_token>`. Errors:

```json
{ "error": { "code": "auth_invalid_token", "message": "Your session is not valid. Sign in again.", "fields": {} } }
```

`message` is always plain language, safe to show. FastAPI generates the OpenAPI schema; this file lists the intended surface. If code and this file differ, fix the file in the same PR.

The generated OpenAPI document defines an HTTP bearer security scheme with `bearerFormat: JWT` and applies it to protected operations. Health endpoints and any future public metadata endpoints explicitly opt out.

## Authentication and security
Supabase Auth handles email magic links, optional OAuth, session persistence, refresh and authentication rate limits. The Think Bee API does not send OTPs, set auth cookies, issue JWTs, refresh sessions or expose logout endpoints.

Every protected FastAPI route uses one shared auth dependency. It reads the bearer token, validates its signature against the Supabase project JWKS, and checks `iss`, `aud`, `exp` and `sub`. The dependency maps `sub` to `users.supabase_user_id`, rejects missing, invalid or expired tokens with `401`, and rejects suspended or deleted local users with `403`. JWKS may be cached with a short TTL, but a signing-key miss triggers one refresh before rejection.

- `POST /auth/bootstrap` (authenticated, idempotent) -> maps the Supabase user to a local user, creates the unique farmer ID on first use, returns `{user, is_new}`
- `DELETE /me` -> starts account deletion

## Me and profiles
- `GET /me`, `PATCH /me`
- `GET /me/chat-profile`, `PATCH /me/chat-profile`
- `GET /users/{farmer_id}` (public chat profile only)
- `GET /users/search?q=` (farmer ID)
- `POST /blocks/{user_id}`, `DELETE /blocks/{user_id}`, `GET /blocks`

## Farms
- `GET/POST /farms`, `GET/PATCH/DELETE /farms/{id}`
- `GET/POST /farms/{id}/units`, `PATCH/DELETE /units/{id}`

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
