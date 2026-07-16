import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "../domain/result";
import { sendMessage } from "../shared/client";
import { PlannerApp } from "./main";

vi.mock("../shared/client", () => ({
  sendMessage: vi.fn(),
  extensionUrl: (path: string) => `chrome-extension://readslot/${path}`
}));

describe("Planner item handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/planner.html");
    vi.mocked(sendMessage).mockImplementation((message) => {
      switch (message.type) {
        case "proposals.list":
        case "weekly.plan":
        case "suggestions.generate":
          return Promise.resolve(ok([]));
        case "calendar.status":
          return Promise.resolve(ok({ configured: false, connected: false }));
        default:
          return Promise.resolve(ok(undefined));
      }
    });
  });

  afterEach(() => cleanup());

  it("automatically scopes suggestions to a valid item ID", async () => {
    window.history.replaceState({}, "", "/planner.html?itemId=item-one");
    render(<PlannerApp />);

    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith({
        type: "suggestions.generate",
        payload: { itemIds: ["item-one"] }
      })
    );
  });

  it("rejects malformed item links without generating suggestions", async () => {
    window.history.replaceState({}, "", `/planner.html?itemId=${"x".repeat(201)}`);
    render(<PlannerApp />);

    expect(await screen.findByText(/planner link is invalid/i)).toBeInTheDocument();
    expect(sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "suggestions.generate" })
    );
  });
});
