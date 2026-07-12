# ADR 0001: Clean TypeScript Foundation

Status: Accepted, 2026-07-13.

Lydra uses a clean strict-TypeScript, React, Vite, Dexie, and Zod implementation instead of
incrementally migrating the small upstream vanilla-JavaScript extension. Useful behavior may be
ported with MIT attribution. This makes local-first boundaries, migrations, and Calendar safety
testable from the start.
