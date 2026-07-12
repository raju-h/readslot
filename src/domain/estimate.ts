import type { ContentType } from "./schemas";

export interface EstimateInput {
  contentType: ContentType;
  readingSpeedWpm: number;
  defaultUnknownMinutes: number;
  wordCount?: number;
  imageCount?: number;
  mediaDurationSeconds?: number;
  pageCount?: number;
}

const roundToFive = (value: number): number => Math.max(5, Math.round(value / 5) * 5);

export const estimateDuration = (
  input: EstimateInput
): { minutes: number; confidence: "high" | "medium" | "low" } => {
  if (input.mediaDurationSeconds !== undefined && input.mediaDurationSeconds > 0) {
    return { minutes: roundToFive(input.mediaDurationSeconds / 60), confidence: "high" };
  }
  if (input.contentType === "pdf" && input.pageCount !== undefined) {
    return { minutes: roundToFive(input.pageCount * 2), confidence: "medium" };
  }
  if (input.wordCount !== undefined && input.wordCount > 0) {
    const imageMinutes = ((input.imageCount ?? 0) * 12) / 60;
    return {
      minutes: roundToFive(input.wordCount / input.readingSpeedWpm + imageMinutes),
      confidence: input.wordCount > 150 ? "high" : "medium"
    };
  }
  if (input.contentType === "repository") return { minutes: 10, confidence: "low" };
  return { minutes: input.defaultUnknownMinutes, confidence: "low" };
};
