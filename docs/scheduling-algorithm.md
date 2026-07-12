# Scheduling Algorithm

The scheduler is a pure deterministic function. It merges FreeBusy intervals, adds configured
buffers, builds allowed local-time windows in the selected IANA timezone, enforces notice and
duration limits, and selects queue items by priority then age. It returns up to three distinct
proposals without calling Calendar.

Confidence is high only when current Calendar data was available. Confirmation rechecks the
exact interval within 30 seconds. A new conflict requires a second explicit confirmation.
