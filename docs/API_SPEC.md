# API_SPEC.md

Base: `/api/v1`. JSON. Auth by httpOnly cookie (access) with CSRF header on unsafe methods. Errors:

```json
{ "error": { "code": "otp_expired", "message": "That code has expired. Ask for a new one.", "fields": {} } }
```

`message` is always plain language, safe to show. FastAPI generates the OpenAPI schema; this file lists the intended surface. If code and this file differ, fix the file in the same PR.

## Auth
- `POST /auth/otp/request` {phone} -> 202
- `POST /auth/otp/verify` {phone, code, device_label} -> sets cookies, returns {user, is_new}
- `POST /auth/refresh` -> rotates refresh token
- `POST /auth/logout`
- `DELETE /me` -> starts account deletion

## Me and profiles
- `GET /me`, `PATCH /me`
- `GET /me/chat-profile`, `PATCH /me/chat-profile`
- `GET /users/{farmer_id}` (public chat profile only)
- `GET /users/search?q=` (farmer ID, or phone if the target allows it)
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
  "likely_causes": [{"name": "string", "confidence": "low|medium|high", "reasoning": "string"}],
  "overall_confidence": "low|medium|high",
  "needs_better_photo": false,
  "better_photo_hint": null,
  "follow_up_questions": ["string"],
  "next_steps": ["string"],
  "pollinator_warning": "string|null",
  "label_notice": "string",
  "expert_referral": "string|null",
  "suggested_record": {"title": "string", "type": "string"},
  "disclaimer_version": "1"
}
```

## Records, reminders, sync
- `GET/POST /records`, `PATCH/DELETE /records/{id}`, `POST /records/from-scan/{scan_id}` (farmer confirms)
- `GET/POST /reminders`, `PATCH/DELETE /reminders/{id}`, `POST /reminders/{id}/done|postpone|dismiss`
- `POST /sync/push` {changes: [{table, op, client_id, data, updated_at}]} -> per item result
- `GET /sync/pull?since=` -> changes

## Chat
- `GET /chats` -> spaces the user is in with last message and unread
- `POST /chats/direct` {user_id | farmer_id | phone}
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
Server events: `message.new`, `message.deleted`, `message.receipt`, `typing`, `presence`, `member.joined`, `member.removed`, `role.changed` (also stored as a system message), `space.updated`, `pin.changed`, `scan.ready`.
Client events: `typing.start|stop`, `read` {space_id, seq}, `resume` {spaces: [{id, last_seq}]}, `ping`.
Every event carries `id` and `space_id` where relevant. Messages are never created through the socket; always through REST, so idempotency and permission checks have one path.

## Limits (all configurable)
`MAX_VOICE_SECONDS`, `MAX_IMAGES_PER_MESSAGE`, `MAX_IMAGE_BYTES`, `MAX_GROUP_MEMBERS`, `MAX_COMMUNITY_MEMBERS`, `SCANS_PER_DAY`, `QUESTIONS_PER_DAY`, `OTP_PER_PHONE_PER_HOUR`.
