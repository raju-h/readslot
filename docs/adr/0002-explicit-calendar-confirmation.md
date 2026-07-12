# ADR 0002: Explicit Calendar Confirmation

Status: Accepted, 2026-07-13.

Suggestions never create events. Confirmation rechecks FreeBusy, persists an idempotency
operation, and submits a deterministic event ID. A new conflict requires a second user action.
This trust guarantee takes precedence over automation or engagement goals.
