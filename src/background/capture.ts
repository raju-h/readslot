import { estimateDuration } from "../domain/estimate";
import { SCHEMA_VERSION, ReadingItemSchema, type ReadingItem } from "../domain/schemas";
import { detectContentType, normalizeUrl } from "../domain/url";
import type { ReadingRepository, SettingsRepository } from "../domain/ports";
import { err, ok, type Result } from "../domain/result";

interface ExtractedMetadata {
  title?: string;
  canonicalUrl?: string;
  faviconUrl?: string;
  wordCount?: number;
  imageCount?: number;
  mediaDurationSeconds?: number;
}

export class CaptureService {
  constructor(
    private readonly items: ReadingRepository,
    private readonly settings: SettingsRepository
  ) {}

  private async extract(tabId: number): Promise<ExtractedMetadata> {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      return await chrome.tabs.sendMessage(tabId, { type: "lydra.extract" });
    } catch {
      return {};
    }
  }

  async fromCurrentTab(): Promise<Result<{ item: ReadingItem; duplicate: boolean }>> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return this.fromTab(tab);
  }

  async fromTab(tab: chrome.tabs.Tab): Promise<Result<{ item: ReadingItem; duplicate: boolean }>> {
    if (!tab.id || !tab.url)
      return err({ code: "UNSUPPORTED_PAGE", message: "This page cannot be saved." });
    const metadata = await this.extract(tab.id);
    return this.fromUrl(
      metadata.canonicalUrl ?? tab.url,
      metadata.title ?? tab.title,
      undefined,
      metadata,
      tab.url
    );
  }

  async fromUrl(
    url: string,
    title?: string,
    notes?: string,
    metadata: ExtractedMetadata = {},
    originalUrlOverride?: string
  ): Promise<Result<{ item: ReadingItem; duplicate: boolean }>> {
    try {
      const currentSettings = await this.settings.get();
      if (!currentSettings.ok) return currentSettings;
      let normalized = normalizeUrl(url);
      if (currentSettings.value.privacyMode && normalized.hasSensitiveParameters) {
        const privateUrl = new URL(normalized.canonicalUrl);
        privateUrl.search = "";
        normalized = normalizeUrl(privateUrl.toString());
      }
      const existing = await this.items.getByCanonicalUrl(normalized.canonicalUrl);
      if (!existing.ok) return existing;
      if (existing.value) {
        if (existing.value.status === "deleted") {
          const restored = await this.items.update(existing.value.id, {
            status: "queued",
            deletedAt: undefined
          });
          return restored.ok ? ok({ item: restored.value, duplicate: false }) : restored;
        }
        return ok({ item: existing.value, duplicate: true });
      }

      const contentType = detectContentType(normalized.canonicalUrl);
      const estimate = estimateDuration({
        contentType,
        readingSpeedWpm: currentSettings.value.readingSpeedWpm,
        defaultUnknownMinutes: currentSettings.value.defaultUnknownMinutes,
        wordCount: metadata.wordCount,
        imageCount: metadata.imageCount,
        mediaDurationSeconds: metadata.mediaDurationSeconds
      });
      const now = new Date().toISOString();
      const parsedUrl = new URL(normalized.canonicalUrl);
      const item = ReadingItemSchema.parse({
        schemaVersion: SCHEMA_VERSION,
        id: crypto.randomUUID(),
        originalUrl: originalUrlOverride ?? normalized.originalUrl,
        canonicalUrl: normalized.canonicalUrl,
        title: title?.trim() || parsedUrl.hostname,
        domain: parsedUrl.hostname,
        faviconUrl: metadata.faviconUrl,
        contentType,
        wordCount: metadata.wordCount,
        imageCount: metadata.imageCount,
        mediaDurationSeconds: metadata.mediaDurationSeconds,
        estimatedMinutes: estimate.minutes,
        estimateConfidence: estimate.confidence,
        priority: "normal",
        tags: [],
        notes,
        status: "queued",
        createdAt: now,
        updatedAt: now
      });
      const stored = await this.items.put(item);
      return stored.ok ? ok({ item: stored.value, duplicate: false }) : stored;
    } catch (error) {
      return err({
        code: "INVALID_INPUT",
        message: error instanceof Error ? error.message : "This URL cannot be saved."
      });
    }
  }

  async toast(
    tabId: number,
    result: Result<{ item: ReadingItem; duplicate: boolean }>
  ): Promise<void> {
    const message = result.ok
      ? result.value.duplicate
        ? "Already saved in Lydra"
        : "Saved to Lydra"
      : result.error.message;
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      await chrome.tabs.sendMessage(tabId, {
        type: "lydra.toast",
        payload: {
          message,
          itemId: result.ok && !result.value.duplicate ? result.value.item.id : undefined
        }
      });
    } catch {
      await chrome.action.setBadgeText({ tabId, text: result.ok ? "✓" : "!" });
      await chrome.action.setBadgeBackgroundColor({
        tabId,
        color: result.ok ? "#4d7c0f" : "#b91c1c"
      });
      setTimeout(() => void chrome.action.setBadgeText({ tabId, text: "" }), 1800);
    }
  }
}
