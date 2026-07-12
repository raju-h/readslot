import type { Table } from "dexie";
import {
  BackupSchema,
  CalendarOperationSchema,
  ProposalSchema,
  ReadingItemSchema,
  ReadingSessionSchema,
  SCHEMA_VERSION,
  SettingsSchema,
  type Backup,
  type CalendarOperation,
  type Proposal,
  type ReadingItem,
  type ReadingSession,
  type Settings
} from "../domain/schemas";
import { createDefaultSettings } from "../domain/settings";
import type {
  BackupRepository,
  CalendarOperationRepository,
  ItemQuery,
  ProposalRepository,
  ReadingRepository,
  SessionRepository,
  SettingsRepository
} from "../domain/ports";
import { err, ok, toDomainError, type Result } from "../domain/result";
import { canTransitionItem } from "../domain/transitions";
import { database, type LydraDatabase } from "./database";

const safe = async <T>(operation: () => Promise<T>): Promise<Result<T>> => {
  try {
    return ok(await operation());
  } catch (error) {
    const domainError = toDomainError(error);
    return err({
      ...domainError,
      code: "STORAGE_ERROR",
      message: "Lydra could not update local storage."
    });
  }
};

export class DexieReadingRepository implements ReadingRepository {
  constructor(private readonly db: LydraDatabase = database) {}

  list(query: ItemQuery = {}): Promise<Result<ReadingItem[]>> {
    return safe(async () => {
      const all = await this.db.items.toArray();
      const search = query.search?.trim().toLowerCase();
      return all
        .filter((item) => (query.includeDeleted ? true : item.status !== "deleted"))
        .filter((item) => (query.status ? item.status === query.status : true))
        .filter((item) => {
          if (!search) return true;
          return [
            item.title,
            item.originalUrl,
            item.domain,
            item.notes ?? "",
            item.collectionId ?? "",
            ...item.tags
          ]
            .join(" ")
            .toLowerCase()
            .includes(search);
        })
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    });
  }

  get(id: string): Promise<Result<ReadingItem>> {
    return safe(async () => {
      const item = await this.db.items.get(id);
      if (!item) throw new Error("Reading item not found.");
      return ReadingItemSchema.parse(item);
    });
  }

  getByCanonicalUrl(url: string): Promise<Result<ReadingItem | undefined>> {
    return safe(async () => {
      const item = await this.db.items.where("canonicalUrl").equals(url).first();
      return item ? ReadingItemSchema.parse(item) : undefined;
    });
  }

  put(item: ReadingItem): Promise<Result<ReadingItem>> {
    return safe(async () => {
      const parsed = ReadingItemSchema.parse(item);
      await this.db.items.put(parsed);
      return parsed;
    });
  }

  update(id: string, changes: Partial<ReadingItem>): Promise<Result<ReadingItem>> {
    return safe(async () => {
      const current = await this.db.items.get(id);
      if (!current) throw new Error("Reading item not found.");
      if (changes.status && !canTransitionItem(current.status, changes.status)) {
        throw new Error(`Invalid item transition from ${current.status} to ${changes.status}.`);
      }
      const next = ReadingItemSchema.parse({
        ...current,
        ...changes,
        id,
        updatedAt: new Date().toISOString()
      });
      await this.db.items.put(next);
      return next;
    });
  }

  remove(id: string, permanent = false): Promise<Result<void>> {
    return safe(async () => {
      if (permanent) {
        await this.db.items.delete(id);
        return;
      }
      const current = await this.db.items.get(id);
      if (!current) return;
      const now = new Date().toISOString();
      await this.db.items.put(
        ReadingItemSchema.parse({ ...current, status: "deleted", deletedAt: now, updatedAt: now })
      );
    });
  }
}

class DexieEntityRepository<T extends { id: string }> {
  constructor(
    private readonly table: Table<T, string>,
    private readonly parse: (value: unknown) => T
  ) {}

  list(): Promise<Result<T[]>> {
    return safe(async () => (await this.table.toArray()).map(this.parse));
  }

  get(id: string): Promise<Result<T>> {
    return safe(async () => {
      const value = await this.table.get(id);
      if (!value) throw new Error("Record not found.");
      return this.parse(value);
    });
  }

  put(value: T): Promise<Result<T>> {
    return safe(async () => {
      const parsed = this.parse(value);
      await this.table.put(parsed);
      return parsed;
    });
  }
}

export class DexieProposalRepository
  extends DexieEntityRepository<Proposal>
  implements ProposalRepository
{
  constructor(db: LydraDatabase = database) {
    super(db.proposals as unknown as Table<Proposal, string>, (value) =>
      ProposalSchema.parse(value)
    );
  }
}

export class DexieSessionRepository
  extends DexieEntityRepository<ReadingSession>
  implements SessionRepository
{
  constructor(db: LydraDatabase = database) {
    super(db.sessions as unknown as Table<ReadingSession, string>, (value) =>
      ReadingSessionSchema.parse(value)
    );
  }
}

export class DexieCalendarOperationRepository implements CalendarOperationRepository {
  constructor(private readonly db: LydraDatabase = database) {}

  get(id: string): Promise<Result<CalendarOperation | undefined>> {
    return safe(async () => {
      const value = await this.db.calendarOperations.get(id);
      return value ? CalendarOperationSchema.parse(value) : undefined;
    });
  }

  put(operation: CalendarOperation): Promise<Result<CalendarOperation>> {
    return safe(async () => {
      const parsed = CalendarOperationSchema.parse(operation);
      await this.db.calendarOperations.put(parsed);
      return parsed;
    });
  }
}

export class ChromeSettingsRepository implements SettingsRepository {
  private readonly key = "settings";

  get(): Promise<Result<Settings>> {
    return safe(async () => {
      const stored = await chrome.storage.local.get(this.key);
      if (!stored[this.key]) return createDefaultSettings();
      const parsed = SettingsSchema.safeParse(stored[this.key]);
      if (!parsed.success) return createDefaultSettings();
      return parsed.data;
    });
  }

  put(settings: Settings): Promise<Result<Settings>> {
    return safe(async () => {
      const parsed = SettingsSchema.parse(settings);
      await chrome.storage.local.set({ [this.key]: parsed });
      return parsed;
    });
  }
}

export class LydraBackupRepository implements BackupRepository {
  constructor(
    private readonly db: LydraDatabase = database,
    private readonly settingsRepository: SettingsRepository = new ChromeSettingsRepository()
  ) {}

  export(): Promise<Result<Backup>> {
    return safe(async () => {
      const settings = await this.settingsRepository.get();
      if (!settings.ok) throw new Error(settings.error.message);
      return BackupSchema.parse({
        kind: "lydra-backup",
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        items: await this.db.items.toArray(),
        proposals: await this.db.proposals.toArray(),
        sessions: await this.db.sessions.toArray(),
        settings: settings.value
      });
    });
  }

  import(backup: Backup): Promise<Result<{ added: number; skipped: number }>> {
    return safe(async () => {
      const parsed = BackupSchema.parse(backup);
      let added = 0;
      let skipped = 0;
      await this.db.transaction(
        "rw",
        [this.db.items, this.db.proposals, this.db.sessions],
        async () => {
          for (const item of parsed.items) {
            const existing = await this.db.items
              .where("canonicalUrl")
              .equals(item.canonicalUrl)
              .first();
            if (existing) skipped += 1;
            else {
              await this.db.items.add(item);
              added += 1;
            }
          }
          await this.db.proposals.bulkPut(parsed.proposals);
          await this.db.sessions.bulkPut(parsed.sessions);
        }
      );
      const savedSettings = await this.settingsRepository.put(parsed.settings);
      if (!savedSettings.ok) throw new Error(savedSettings.error.message);
      return { added, skipped };
    });
  }
}
