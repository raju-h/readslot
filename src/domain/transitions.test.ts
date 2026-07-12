import { describe, expect, it } from "vitest";
import { canTransitionItem } from "./transitions";

describe("item transitions", () => {
  it("allows the complete scheduling loop", () => {
    expect(canTransitionItem("queued", "proposed")).toBe(true);
    expect(canTransitionItem("proposed", "scheduled")).toBe(true);
    expect(canTransitionItem("scheduled", "in_progress")).toBe(true);
    expect(canTransitionItem("in_progress", "completed")).toBe(true);
  });

  it("does not silently revive deleted content", () => {
    expect(canTransitionItem("deleted", "scheduled")).toBe(false);
    expect(canTransitionItem("deleted", "queued")).toBe(true);
  });
});
