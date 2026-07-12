# Testing

Run `pnpm check` for formatting, strict type checking, zero-warning lint, unit/property tests,
production build, and manifest validation. Run `pnpm test:e2e` after a build for Chrome UI
flows. OAuth adapters are mocked in automation; use a dedicated test calendar for the manual
connect, FreeBusy, conflict, create, move, delete, revoke, and disconnect checklist.

Never use personal Calendar data in fixtures, screenshots, logs, or bug reports.
