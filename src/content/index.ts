import { Readability } from "@mozilla/readability";

declare global {
  interface Window {
    __READSLOT_CONTENT_READY__?: boolean;
  }
}

const parseIsoDuration = (value?: string): number | undefined => {
  if (!value) return undefined;
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return undefined;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
};

const extract = () => {
  const clone = document.cloneNode(true) as Document;
  const article = new Readability(clone, { charThreshold: 100 }).parse();
  const text = article?.textContent ?? document.body?.innerText ?? "";
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  const duration = document.querySelector<HTMLMetaElement>('meta[itemprop="duration"]')?.content;
  const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href;
  return {
    title: (article?.title || document.title || location.hostname).slice(0, 500),
    canonicalUrl: canonical,
    faviconUrl: favicon,
    wordCount: text.trim() ? text.trim().split(/\s+/u).length : undefined,
    imageCount: document.images.length,
    mediaDurationSeconds: parseIsoDuration(duration)
  };
};

const showToast = (message: string, itemId?: string) => {
  document.getElementById("readslot-toast-host")?.remove();
  const host = document.createElement("div");
  host.id = "readslot-toast-host";
  host.style.cssText =
    "position:fixed;z-index:2147483647;right:20px;top:50%;transform:translateY(-50%)";
  const shadow = host.attachShadow({ mode: "closed" });
  const box = document.createElement("div");
  box.setAttribute("role", "status");
  box.style.cssText =
    "display:flex;gap:12px;align-items:center;background:#19172b;color:#fff;border:1px solid #514a7c;border-radius:14px;padding:12px 14px;box-shadow:0 16px 40px #0005;font:600 14px/1.3 system-ui";
  box.textContent = message;
  if (itemId) {
    const undo = document.createElement("button");
    undo.textContent = "Undo";
    undo.style.cssText =
      "border:0;border-radius:8px;padding:6px 9px;background:#c9f56b;color:#211d3d;font:inherit;cursor:pointer";
    undo.addEventListener("click", () => {
      void chrome.runtime.sendMessage({ type: "capture.undo", payload: { itemId } });
      host.remove();
    });
    box.append(undo);
  }
  const open = document.createElement("button");
  open.textContent = "Open ReadSlot";
  open.style.cssText = "border:0;background:transparent;color:#c9f56b;font:inherit;cursor:pointer";
  open.addEventListener(
    "click",
    () => void chrome.runtime.sendMessage({ type: "readslot.open", payload: {} })
  );
  box.append(open);
  shadow.append(box);
  document.documentElement.append(host);
  setTimeout(() => host.remove(), 6000);
};

if (!window.__READSLOT_CONTENT_READY__) {
  window.__READSLOT_CONTENT_READY__ = true;
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (typeof message !== "object" || message === null || !("type" in message)) return;
    if (message.type === "readslot.extract") sendResponse(extract());
    if (message.type === "readslot.toast" && "payload" in message) {
      const payload = message.payload as { message: string; itemId?: string };
      showToast(payload.message, payload.itemId);
      sendResponse(true);
    }
  });
}
