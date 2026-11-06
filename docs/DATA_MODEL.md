# DATA_MODEL.md

PostgreSQL. UUID primary keys (v7). `created_at`, `updated_at` on every table. Soft delete only where stated.

## Identity
- `users`: id, supabase_user_id (unique, Supabase `sub` UUID), farmer_id (unique, server generated, format `TB-` + 8 chars Crockford base32), status (active, suspended, deleted), is_think_bee_admin, locale, last_seen_at
- `devices`: id, user_id, label, push_subscription (json), last_used_at
- `chat_profiles`: user_id (pk), display_name, photo_key, bio, area_state, area_lga, show_crops, show_hive_type
- `blocks`: blocker_id, blocked_id
- `account_deletions`: user_id (pk), status (pending, completed), attempts, next_attempt_at, completed_at, last_error_code; durable Supabase cleanup work, indexed by `(status, next_attempt_at)`

## Farms and records
- `farms`: id, user_id, client_id (unique per user), name, kind (crops, bees, both), state, lga, lat, lng (private, never exposed to others)
- `farm_units`: id, farm_id, client_id (unique per farm), kind (hive, crop_block), name, details (jsonb: hive_type, crop, area_hectares)
- `scans`: id, user_id, farm_id, unit_id, subject (hive, crop), status (queued, analysing, done, failed), result (jsonb, validated), prompt_version, model, created_at
- `scan_images`: id, scan_id, storage_key, width, height
- `assistant_threads`: id, user_id, farm_id, unit_id
- `assistant_messages`: id, thread_id, role (user, assistant), body, attachments, safety (jsonb), feedback
- `records`: id, user_id, farm_id, unit_id, type, title, note, occurred_at, source (manual, scan), scan_id, status (draft, saved), client_id (unique per user)
- `reminders`: id, user_id, farm_id, unit_id, type, title, due_at, repeat_rule, state (open, done, postponed, dismissed), client_id
- `daily_briefings`: id, user_id, farm_id, local_date, status (ready, limited, unavailable), content (jsonb, validated), prompt_version, weather_observed_at, generated_at; unique `(user_id, farm_id, local_date)`
- `predictive_alerts`: id, user_id, farm_id, kind, risk_level, evidence (jsonb), rule_version, forecast_start, forecast_end, expires_at, state (pending, sent, read, expired), created_at

Normalized weather snapshots are cached in Redis rather than persisted as user history. A briefing stores only the weather observation timestamp and privacy-reduced evidence needed to explain its advice; it does not store exact live GPS coordinates.

## Chat
- `spaces`: id, kind (direct, group, community, topic_room), parent_space_id (for topic rooms), name, description, photo_key, visibility (public, private), posting_mode (everyone, admins_only), invite_code, rules_text, created_by, closed_at
- `memberships`: space_id, user_id, role (space_admin, moderator, member), joined_at, muted_until, last_read_seq, rules_accepted_at, removed_at
- `messages`: id, space_id, seq (bigint per space), sender_id (null for system), kind (text, image, voice, scan_card, system), body, reply_to_id, client_msg_id (unique per sender), meta (jsonb), deleted_at, deleted_by
- `message_media`: id, message_id, kind (image, audio), storage_key, thumb_key, bytes, width, height, duration_ms, waveform (int array)
- `scan_shares`: message_id, scan_id, snapshot (jsonb copy of the result at share time, immutable)
- `pins`: space_id, message_id, pinned_by
- `reactions`: not in MVP

## Safety
- `reports`: id, reporter_id, target_type (message, user, space), target_id, reason, note, status (open, actioned, dismissed), handled_by, handled_at
- `moderation_actions`: id, space_id, actor_id, action (remove_message, mute_member, remove_member, role_change, suspend_user, close_space), target_id, detail, created_at
- `audit_log`: id, actor_id, event, detail, ip, created_at

## Rules
- A space always has at least one `space_admin` (enforced in service and by a deferred constraint trigger).
- Direct chats are `spaces` with kind `direct` and exactly two memberships, unique per pair.
- `scan_shares.snapshot` makes shared cards immutable even if the original scan is later edited or deleted.
- Deleting an account: set `users.status=deleted`, remove chat profile and farm data, null `sender_id` display as "Deleted user", delete scan images, queue media deletion, then delete the Supabase Auth user with the backend service-role credential.
- Phase 1 implements cleanup for the current tables: profile and farms/units are removed in the same transaction as the deleted-user tombstone and durable deletion job. Farm units cascade when their farm is deleted. The background worker hard-deletes the Supabase user only after that transaction commits; transient failures keep retrying. Every later module must add its private-data/media cleanup before being enabled.
- Indexes: `users (supabase_user_id)` unique, `messages (space_id, seq desc)`, `messages (client_msg_id, sender_id)` unique, `memberships (user_id)`, `reports (status, created_at)`.
- Additional indexes: `daily_briefings (user_id, farm_id, local_date)` unique, `predictive_alerts (user_id, farm_id, state, expires_at)`.
