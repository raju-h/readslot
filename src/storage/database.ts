import Dexie, { type EntityTable } from "dexie";
import type { CalendarOperation, Proposal, ReadingItem, ReadingSession } from "../domain/schemas";

export class ReadSlotDatabase extends Dexie {
  items!: EntityTable<ReadingItem, "id">;
  proposals!: EntityTable<Proposal, "id">;
  sessions!: EntityTable<ReadingSession, "id">;
  calendarOperations!: EntityTable<CalendarOperation, "id">;

  constructor(name = "readslot") {
    super(name);
    this.version(1).stores({
      items: "&id, &canonicalUrl, status, priority, createdAt, updatedAt, deletedAt, *tags",
      proposals: "&id, status, generatedAt, expiresAt, *itemIds",
      sessions: "&id, calendarEventId, status, start, end, *itemIds",
      calendarOperations: "&id, &proposalId, &deterministicEventId, state, updatedAt"
    });
  }
}

export const database = new ReadSlotDatabase();
