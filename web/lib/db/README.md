# Local database

`onboarding.ts` defines the account-scoped setup cache, editable drafts and submitted profile/farm jobs in Dexie. It contains no authentication tokens or email addresses. SDK sessions remain owned by Supabase.

The setup queue keeps submitted snapshots separate from unsent edits. Profile jobs use revision IDs so an older response cannot erase a newer submission. Farms and units retain their client IDs through partial success. Clearing local data advances a generation and sync updates only existing rows, so in-flight work cannot recreate data after sign-out.

Records, reminders, chats, messages, media queues and general sync state belong to later roadmap tasks. The service worker now handles shell/page fallback separately; private feature data still belongs in account-scoped Dexie tables rather than HTTP caches.
