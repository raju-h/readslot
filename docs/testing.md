# Testing

Run `pnpm check` for formatting, strict type checking, zero-warning lint, unit/property tests,
production build, and manifest validation. Run `pnpm test:e2e` after a build for Chrome UI
flows. OAuth adapters are mocked in automation; use a dedicated test calendar for the manual
connect, FreeBusy, conflict, create, move, delete, revoke, and disconnect checklist.

GitHub Actions are intentionally disabled. Before every push, run both `pnpm check` and
`pnpm test:e2e` locally and report any skipped manual checks. npm Dependabot remains enabled,
but dependency updates are accepted only after these local gates pass.

Never use personal Calendar data in fixtures, screenshots, logs, or bug reports.

Automated integration coverage includes Calendar `404`, `409`, `500`, timed-out-create
reconciliation, initial lookup failure, and atomic session review rollback. These tests do not
replace the release checklist's real-OAuth and unpacked-extension smoke tests, which remain manual
because they depend on the configured Chrome extension identity and a dedicated Google account.
