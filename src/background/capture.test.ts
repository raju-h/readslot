import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadingRepository, SettingsRepository } from "../domain/ports";
import { ReadingItemSchema, SCHEMA_VERSION, type ReadingItem } from "../domain/schemas";
import { createDefaultSettings } from "../domain/settings";
import { ok } from "../domain/result";
import { CaptureService } from "./capture";

const makeItem = (): ReadingItem =>
  ReadingItemSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id: "saved-item",
    originalUrl: "https://example.com/article",
    canonicalUrl: "https://example.com/article",
    title: "Saved article",
    domain: "example.com",
    contentType: "article",
    estimatedMinutes: 10,
    estimateConfidence: "high",
    priority: "normal",
    tags: [],
    status: "queued",
    createdAt: "2026-07-17T00:00:00.000Z",
    updatedAt: "2026-07-17T00:00:00.000Z"
  });

describe("CaptureService preview", () => {
  const getByCanonicalUrl = vi.fn();
  const put = vi.fn();
  const queryTabs = vi.fn();
  const repository = {
    getByCanonicalUrl,
    put
  } as unknown as ReadingRepository;
  const settings = {
    get: vi.fn(() => Promise.resolve(ok(createDefaultSettings())))
  } as unknown as SettingsRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    queryTabs.mockResolvedValue([
      { id: 7, url: "https://example.com/article?utm_source=test", title: "Tab title" }
    ]);
    vi.stubGlobal("chrome", {
      tabs: {
        query: queryTabs,
        sendMessage: vi.fn(() =>
          Promise.resolve({ title: "Preview title", wordCount: 1_100, imageCount: 2 })
        )
      },
      scripting: { executeScript: vi.fn(() => Promise.resolve()) }
    });
  });

  it("previews and detects normalized duplicates without writing", async () => {
    getByCanonicalUrl.mockResolvedValue(ok(makeItem()));
    const result = await new CaptureService(repository, settings).previewCurrentTab();

    expect(result.ok && result.value).toMatchObject({
      title: "Preview title",
      canonicalUrl: "https://example.com/article",
      duplicate: true,
      existingItemId: "saved-item",
      existingItemStatus: "queued"
    });
    expect(put).not.toHaveBeenCalled();
  });

  it("rejects restricted pages without extracting or writing", async () => {
    queryTabs.mockResolvedValue([{ id: 7, url: "chrome://extensions", title: "Extensions" }]);
    const result = await new CaptureService(repository, settings).previewCurrentTab();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNSUPPORTED_PAGE");
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("writes only once when the same page is captured twice", async () => {
    const saved = makeItem();
    getByCanonicalUrl.mockResolvedValueOnce(ok(undefined)).mockResolvedValueOnce(ok(saved));
    put.mockResolvedValue(ok(saved));
    const service = new CaptureService(repository, settings);

    const first = await service.fromCurrentTab();
    const second = await service.fromCurrentTab();

    expect(first.ok && first.value.duplicate).toBe(false);
    expect(second.ok && second.value.duplicate).toBe(true);
    expect(put).toHaveBeenCalledTimes(1);
  });
});
