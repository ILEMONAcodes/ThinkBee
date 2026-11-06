# CHAT_SYSTEM.md

## Spaces
- **Direct**: two farmers. Started from a profile, a member list, a phone number or a farmer ID. Blocked users cannot start one.
- **Group**: created by a Think Bee admin. Private by default. Join by invite link, code, or admin add.
- **Community**: created by a Think Bee admin. Public (searchable) or private. Posting mode everyone or admins only. May hold topic rooms.
- **Topic room**: child of a community. Inherits membership and rules, has its own messages.

## Roles and permissions
One module, `modules/chat/permissions.py`, answers "can this user do this action in this space". No inline role checks anywhere else.

| Action | Member | Moderator | Space admin | Think Bee admin |
| --- | --- | --- | --- | --- |
| Read and post (if posting allowed) | yes | yes | yes | yes |
| Delete own message | yes | yes | yes | yes |
| Report, mute space, leave | yes | yes | yes | yes |
| Remove others' messages and media | no | yes | yes | yes |
| Mute a member for a time | no | yes | yes | yes |
| Review reports in the space | no | yes | yes | yes |
| Remove a member, pin, set rules and posting mode, invite | no | no | yes | yes |
| Create topic rooms, assign moderators and members | no | no | yes | yes |
| Assign space admins | no | no | yes | yes |
| Create groups and communities | no | no | no | yes |
| Suspend accounts, close spaces, assign any role anywhere | no | no | no | yes |

Rules: every role change writes a system message ("Ada Obi is now a moderator."). A space cannot lose its last admin; leaving requires naming a successor. A moderator cannot change roles.

## Messages
- Kinds: text, image (1 to N), voice, scan_card, system.
- Client creates `client_msg_id` (UUID). Server returns the existing message when it sees the same id again.
- Order by `seq` per space. The client shows its own pending messages at the bottom until acknowledged.
- Delivery states: queued (outbox), sent (server accepted), delivered (reached a recipient device), read (recipient read up to seq). Group and community show read counts only for admins, not per person.
- Edit is not in the MVP. Delete own message is.
- Removed messages leave a tombstone "Message removed" for members.

## Media
- **Images**: compressed on device (target long side 1600px, JPEG or WebP quality about 0.7), up to the configured count, each previewed with an optional caption. Upload via presigned URL, then message creation references the keys. Server re-validates type, strips EXIF, makes thumbnails.
- **Voice notes**: MediaRecorder, Opus in WebM where supported, AAC in MP4 on Safari, low bitrate (about 16 to 24 kbps). Press and hold to record, slide left to cancel, slide up to lock. Max length from settings. Waveform generated on device and stored as a small int array for instant rendering. Server probes duration and rejects over-limit files. The AI never receives voice notes.
- **Scan card**: the sender picks a scan from history. Server copies the stored result to `scan_shares.snapshot`. The card renders from the snapshot: likely cause, confidence, the label notice and expert notice. It cannot be edited, and the warning fields are mandatory in the renderer (a card missing them is not shown).

## Outbox
Dexie table `outbox` rows: id (`client_msg_id`), space_id, payload, media parts with per-part state, attempts, next_try_at, status. Worker rules: per-space FIFO, exponential backoff capped at 60s, resume uploads by part, mark failed after N tries with a visible Retry, delete on ack. UI shows each state. Never drop a message silently.

## Notifications
Push for new messages with sender name and a short preview (preview off by setting for private contexts). Per-space mute, global quiet hours later. No push for muted spaces or blocked users. Notification click opens the exact room and scrolls to the message.

## Safety
- Report from long-press menu: message, person, space. Reports store a snapshot of the message and the nearest context so they stay reviewable after deletion.
- Block hides the user's messages in shared groups for the blocker and prevents direct contact.
- Standing notice in every group and community: advice from members is not expert advice, and serious or uncertain cases need an extension officer or expert. Fixed copy, shown pinned at the top and on first join.
- Rules screen shown on first join to a community. `rules_accepted_at` stored.
- Rate limits on message sending per user and per space (spam guard). New accounts have a lower media rate for the first day.
- Messages are encrypted in transit and at rest, not end-to-end. Tell users plainly in Privacy and data.
- The AI does not read or post in chats.

## Not in the MVP
Calls, end-to-end encryption, AI helper in groups, summaries, channels and verified badges, marketplace and payments, non-photo files, translation and voice transcription, reactions, stickers, polls, status.
