import { describe, expect, it } from "vitest";
import { estimateDuration } from "./estimate";

describe("estimateDuration", () => {
  it("uses word count and image overhead for articles", () => {
    expect(
      estimateDuration({
        contentType: "article",
        readingSpeedWpm: 200,
        defaultUnknownMinutes: 15,
        wordCount: 2_000,
        imageCount: 5
      })
    ).toEqual({ minutes: 10, confidence: "high" });
  });

  it("prefers known media duration", () => {
    expect(
      estimateDuration({
        contentType: "video",
        readingSpeedWpm: 220,
        defaultUnknownMinutes: 15,
        mediaDurationSeconds: 1_320
      })
    ).toEqual({ minutes: 20, confidence: "high" });
  });

  it("uses safe fallbacks", () => {
    expect(
      estimateDuration({
        contentType: "repository",
        readingSpeedWpm: 220,
        defaultUnknownMinutes: 15
      })
    ).toEqual({ minutes: 10, confidence: "low" });
    expect(
      estimateDuration({ contentType: "other", readingSpeedWpm: 220, defaultUnknownMinutes: 25 })
    ).toEqual({ minutes: 25, confidence: "low" });
  });
});
