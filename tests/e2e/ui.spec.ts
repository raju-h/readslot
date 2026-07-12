import { expect, test, type Page } from "@playwright/test";

const now = "2026-07-14T12:00:00.000Z";

const installChromeMock = async (page: Page) => {
  await page.addInitScript(
    ({ now }) => {
      const item = {
        schemaVersion: 1,
        id: "item-1",
        originalUrl: "https://example.com/local-first-reading",
        canonicalUrl: "https://example.com/local-first-reading",
        title: "A practical guide to local-first software",
        domain: "example.com",
        contentType: "article",
        estimatedMinutes: 30,
        estimateConfidence: "high",
        priority: "high",
        tags: ["architecture"],
        status: "queued",
        createdAt: now,
        updatedAt: now
      };
      const proposal = {
        schemaVersion: 1,
        id: "proposal-1",
        itemIds: [item.id],
        calendarId: "primary",
        title: "ReadSlot — 1 item",
        description: "1. A practical guide to local-first software",
        suggestedStart: "2026-07-15T12:00:00.000Z",
        suggestedEnd: "2026-07-15T12:30:00.000Z",
        durationMinutes: 30,
        reminderMinutes: 10,
        score: 82,
        explanation: ["Fits your preferred 30-minute window.", "Includes 1 high-priority item."],
        confidence: "high",
        conflictStatus: "clear",
        transparency: "opaque",
        status: "ready",
        generatedAt: now,
        expiresAt: "2026-07-15T12:00:00.000Z"
      };
      const successful = (value: unknown) => ({ ok: true, value });
      const chromeTarget = window.chrome ?? {};
      Object.defineProperty(chromeTarget, "runtime", {
        value: {
          getURL: (path: string) => `http://127.0.0.1:4173/${path}`,
          sendMessage: (message: { type: string }) => {
            if (message.type === "items.list") return successful([item]);
            if (message.type === "dashboard.stats")
              return successful({
                totalItems: 1,
                queuedItems: 1,
                scheduledItems: 0,
                completedItems: 0,
                queueMinutes: 30,
                completedSessions: 0
              });
            if (message.type === "proposals.list" || message.type === "suggestions.generate")
              return successful([proposal]);
            if (message.type === "calendar.status")
              return successful({ configured: true, connected: true });
            if (message.type === "weekly.plan")
              return successful([
                {
                  id: "light",
                  label: "Light",
                  blocks: 1,
                  minutes: 30,
                  description: "A gentle start."
                }
              ]);
            if (message.type === "proposals.confirm") return successful({ id: "session-1" });
            return successful(undefined);
          }
        },
        configurable: true
      });
      if (!window.chrome)
        Object.defineProperty(window, "chrome", { value: chromeTarget, configurable: true });
    },
    { now }
  );
};

test("queue renders local reading data and primary actions", async ({ page }) => {
  await installChromeMock(page);
  await page.goto("/queue.html");
  await expect(page.getByRole("heading", { name: "Make later happen." })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "A practical guide to local-first software" })
  ).toBeVisible();
  await expect(page.getByText("30 min").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Plan reading time" })).toBeVisible();
  await page.screenshot({ path: "store-assets/screenshots/queue.png" });
});

test("planner keeps event creation behind explicit confirmation", async ({ page }) => {
  await installChromeMock(page);
  await page.goto("/planner.html");
  await expect(page.getByRole("link", { name: "ReadSlot home" })).toBeVisible();
  await expect(
    page.getByText("Nothing is added to Calendar until you press the confirmation button.")
  ).toBeVisible();
  await page.screenshot({ path: "store-assets/screenshots/planner.png" });
  await page.getByRole("button", { name: "Create reading block" }).click();
  await expect(
    page.getByText("Reading block created. Your items are now scheduled.")
  ).toBeVisible();
});
