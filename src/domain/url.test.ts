import { describe, expect, it } from "vitest";
import { detectContentType, normalizeUrl } from "./url";

describe("normalizeUrl", () => {
  it("removes fragments, tracking parameters, duplicate slashes at the end, and sorts queries", () => {
    expect(
      normalizeUrl("HTTPS://Example.COM/read/?utm_source=news&b=2&a=1#section").canonicalUrl
    ).toBe("https://example.com/read?a=1&b=2");
  });

  it("preserves meaningful query parameters and flags sensitive ones", () => {
    const value = normalizeUrl("https://example.com/private?document=3&access_token=secret");
    expect(value.canonicalUrl).toContain("document=3");
    expect(value.hasSensitiveParameters).toBe(true);
  });

  it("rejects non-web protocols", () => {
    expect(() => normalizeUrl("chrome://settings")).toThrow(/HTTP/);
  });
});

describe("detectContentType", () => {
  it.each([
    ["https://example.com/paper.pdf", "pdf"],
    ["https://youtu.be/video", "video"],
    ["https://github.com/openai/codex", "repository"],
    ["https://example.com/article", "article"]
  ])("classifies %s", (url, expected) => expect(detectContentType(url)).toBe(expected));
});
