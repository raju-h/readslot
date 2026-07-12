import { beforeEach, describe, expect, it } from "vitest";
import { SCHEMA_VERSION, ReadingItemSchema } from "../domain/schemas";
import { ReadSlotDatabase } from "./database";
import { DexieReadingRepository } from "./repositories";

const makeItem = (id: string, url = `https://example.com/${id}`) =>
  ReadingItemSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id,
    originalUrl: url,
    canonicalUrl: url,
    title: `Item ${id}`,
    domain: "example.com",
    contentType: "article",
    estimatedMinutes: 15,
    estimateConfidence: "medium",
    priority: "normal",
    tags: [],
    status: "queued",
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z"
  });

describe("DexieReadingRepository", () => {
  let db: ReadSlotDatabase;
  let repository: DexieReadingRepository;
  beforeEach(async () => {
    db = new ReadSlotDatabase(`test-${crypto.randomUUID()}`);
    repository = new DexieReadingRepository(db);
    await db.open();
  });

  it("persists, searches, updates, and soft-deletes items", async () => {
    expect((await repository.put(makeItem("one"))).ok).toBe(true);
    expect((await repository.list({ search: "Item one" })).ok).toBe(true);
    const updated = await repository.update("one", { status: "completed" });
    expect(updated.ok && updated.value.status).toBe("completed");
    await repository.remove("one");
    const visible = await repository.list();
    expect(visible.ok && visible.value).toHaveLength(0);
    const deleted = await repository.list({ status: "deleted", includeDeleted: true });
    expect(deleted.ok && deleted.value).toHaveLength(1);
  });

  it("enforces canonical URL uniqueness", async () => {
    await repository.put(makeItem("one"));
    const duplicate = await repository.put(makeItem("two", "https://example.com/one"));
    expect(duplicate.ok).toBe(false);
  });
});
