const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src"
]);

const SENSITIVE_PARAMETERS =
  /(?:access|auth|code|credential|key|password|secret|session|signature|token)/i;

export interface NormalizedUrl {
  originalUrl: string;
  canonicalUrl: string;
  hasSensitiveParameters: boolean;
}

export const normalizeUrl = (input: string): NormalizedUrl => {
  const url = new URL(input.trim());
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Only HTTP and HTTPS pages are supported.");

  const originalUrl = url.toString();
  const hasSensitiveParameters = [...url.searchParams.keys()].some((key) =>
    SENSITIVE_PARAMETERS.test(key)
  );
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }

  url.searchParams.sort();
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");

  return { originalUrl, canonicalUrl: url.toString(), hasSensitiveParameters };
};

export const detectContentType = (
  url: string
): "article" | "video" | "pdf" | "repository" | "other" => {
  const parsed = new URL(url);
  if (parsed.pathname.toLowerCase().endsWith(".pdf")) return "pdf";
  if (["youtube.com", "www.youtube.com", "youtu.be"].includes(parsed.hostname)) return "video";
  if (parsed.hostname === "github.com" && parsed.pathname.split("/").filter(Boolean).length >= 2)
    return "repository";
  if (["http:", "https:"].includes(parsed.protocol)) return "article";
  return "other";
};
