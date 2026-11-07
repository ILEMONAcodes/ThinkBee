# GIT_WORKFLOW.md

## Commit messages

Write them the way a developer writes them: short, plain, lowercase, specific.

Format: `area: what changed`

- Imperative or plain present tense. "add", "fix", "move", "remove", "queue", "rename".
- 72 characters or fewer on the first line.
- Lowercase after the colon. No full stop at the end.
- `area` is one of: `web`, `api`, `auth`, `scan`, `assistant`, `records`, `reminders`, `chat`, `uploads`, `push`, `pwa`, `ui`, `db`, `infra`, `docs`, `test`, `deps`.
- Add a body only when the reason is not obvious. One or two plain sentences about why, not a recap of the diff.

Good:
```
chat: queue messages in outbox when offline
api: reject voice notes over the configured length
ui: fix bottom nav indicator jump on tab change
db: add unique index on farmer_id
scan: retry upload after network drops
pwa: cache the offline page on install
```

Bad (never write these):
```
✨ feat: supercharge the chat experience
Enhance seamless offline robustness leveraging IndexedDB
fix: squashing that pesky bug 🐛
chore: buzz buzz, another hive of activity
Update files
This commit adds…
```

Banned in messages: emoji, jokes, puns, bee or honey wordplay, pop-culture references, exclamation marks, and the words "seamless", "robust", "leverage", "enhance", "streamline", "comprehensive", "delve", "utilize", "powerful", "supercharge", "elevate", "magic".

No `Co-authored-by`, no "Generated with" trailers, no tool signatures. One logical change per commit. Do not commit generated files, secrets, or `.env`.

The versioned FastAPI contract snapshot at `web/lib/api/openapi.json` is the exception: it is a build input for frontend-only deployments, checked against a fresh backend export in CI. Generated TypeScript clients, mocks and service workers remain ignored.

## Branches

- `main`: always deployable. Protected.
- `dev`: integration branch.
- Feature branches from `dev`: `web/chat-outbox`, `api/supabase-auth`, `design/tokens`. Lowercase, hyphens, role prefix.

## Pull requests

Title follows the commit format. Description has three short parts: what changed, how to test it, anything reviewers should check (schema change, new env var, API change). Screenshots or a short screen recording for UI work, in light and dark. If the API contract changed, update `docs/API_SPEC.md` in the same PR and tag the other developer.

## Two-developer flow

Dev 1 owns `web/`, Dev 2 owns `api/`. Neither edits the other's folder except for contract files. The contract is `docs/API_SPEC.md` plus the generated OpenAPI schema. Frontend develops against a mock server (MSW) built from the schema until the real endpoint lands.
