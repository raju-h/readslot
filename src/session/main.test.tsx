import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { err, ok } from "../domain/result";
import {
  ReadingItemSchema,
  ReadingSessionSchema,
  SCHEMA_VERSION,
  type ReadingItem,
  type ReadingSession
} from "../domain/schemas";
import { sendMessage } from "../shared/client";
import { SessionApp } from "./main";

vi.mock("../shared/client", () => ({
  sendMessage: vi.fn(),
  extensionUrl: (path: string) => `chrome-extension://readslot/${path}`
}));

const makeItem = (id: string): ReadingItem =>
  ReadingItemSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id,
    originalUrl: `https://example.com/${id}`,
    canonicalUrl: `https://example.com/${id}`,
    title: `Item ${id}`,
    domain: "example.com",
    contentType: "article",
    estimatedMinutes: 15,
    estimateConfidence: "medium",
    priority: "normal",
    tags: [],
    status: "scheduled",
    createdAt: "2030-01-01T00:00:00.000Z",
    updatedAt: "2030-01-01T00:00:00.000Z"
  });

const items = [makeItem("one"), makeItem("two")];
const session: ReadingSession = ReadingSessionSchema.parse({
  schemaVersion: SCHEMA_VERSION,
  id: "session-one",
  itemIds: items.map((item) => item.id),
  completedItemIds: [],
  skippedItemIds: [],
  calendarId: "primary",
  calendarEventId: "event-one",
  start: "2030-01-03T12:00:00.000Z",
  end: "2030-01-03T12:30:00.000Z",
  status: "scheduled",
  createdAt: "2030-01-01T00:00:00.000Z",
  updatedAt: "2030-01-01T00:00:00.000Z",
  lastSyncedAt: "2030-01-01T00:00:00.000Z"
});

describe("SessionApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendMessage).mockImplementation((message) => {
      if (message.type === "sessions.list") return Promise.resolve(ok([session]));
      if (message.type === "items.list") return Promise.resolve(ok(items));
      if (message.type === "sessions.review")
        return Promise.resolve(ok({ ...session, status: "completed" }));
      return Promise.resolve(ok(undefined));
    });
  });

  afterEach(() => cleanup());

  it("submits distinct completed, skipped, and unfinished outcomes", async () => {
    const user = userEvent.setup();
    render(<SessionApp />);

    await user.selectOptions(await screen.findByLabelText("Outcome for Item one"), "completed");
    await user.selectOptions(screen.getByLabelText("Outcome for Item two"), "skipped");
    await user.click(screen.getByRole("button", { name: "Finish review" }));

    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith({
        type: "sessions.review",
        payload: {
          sessionId: "session-one",
          completedItemIds: ["one"],
          skippedItemIds: ["two"]
        }
      })
    );
    expect(await screen.findByText(/review saved/i)).toHaveAttribute("role", "status");
  });

  it("announces a rejected review as an error", async () => {
    vi.mocked(sendMessage).mockImplementation((message) => {
      if (message.type === "sessions.list") return Promise.resolve(ok([session]));
      if (message.type === "items.list") return Promise.resolve(ok(items));
      if (message.type === "sessions.review")
        return Promise.resolve(
          err({ code: "CONFLICT", message: "This reading session was already reviewed." })
        );
      return Promise.resolve(ok(undefined));
    });
    const user = userEvent.setup();
    render(<SessionApp />);

    await user.click(await screen.findByRole("button", { name: "Finish review" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already reviewed/i);
  });
});
