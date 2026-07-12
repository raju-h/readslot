# Data Model

All persisted records carry `schemaVersion: 1` and are validated with Zod.

- `ReadingItem`: local URL metadata, estimate, priority, organization, lifecycle, and timestamps.
- `Proposal`: editable non-booking candidate, explanation, expiry, validation, and selected items.
- `ReadingSession`: confirmed Calendar mapping and per-item review outcomes.
- `CalendarOperation`: persistent idempotency/reconciliation state for event creation.
- `Settings`: schedule boundaries, timezone, calendars, reminders, privacy, and notification choices.

Item states are `queued`, `proposed`, `scheduled`, `in_progress`, `completed`, `archived`, and
`deleted`. Deleted items are retained locally for 30 days unless permanently removed.
