# Architecture

ReadSlot is a local-first Manifest V3 extension. React pages communicate through a Zod-validated
message union with a non-persistent background service worker. The worker owns application
services and calls typed adapters for IndexedDB, Chrome Identity, Google Calendar, settings,
alarms, and notifications.

The toolbar action opens a review popup and injects `content.js` only to preview sanitized metadata
after that user gesture. The popup does not persist anything until the user chooses Save for later
or Save & choose time. Context-menu and keyboard capture remain immediate and use the isolated
content bundle for center-right save/Undo feedback. There is no persistent content script and no
`<all_urls>` permission.

Domain schemas are the runtime source of truth. UI components do not call Dexie, Chrome, or
Google directly. Calendar proposals contain no side effects; confirmation performs a fresh
FreeBusy check, persists an operation, and uses a deterministic Google event ID for retry
reconciliation.
