import { beforeEach, describe, expect, it, vi } from "vitest";

type RuntimeListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => void;

describe("capture toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    document.documentElement.innerHTML = "<head></head><body></body>";
    window.__READSLOT_CONTENT_READY__ = undefined;
  });

  it("places feedback at center-right and removes it after six seconds", async () => {
    let listener: RuntimeListener | undefined;
    vi.stubGlobal("chrome", {
      runtime: {
        onMessage: {
          addListener: vi.fn((next: RuntimeListener) => {
            listener = next;
          })
        },
        sendMessage: vi.fn()
      }
    });
    await import("./index");

    listener?.(
      { type: "readslot.toast", payload: { message: "Already saved in ReadSlot" } },
      {},
      vi.fn()
    );
    const host = document.getElementById("readslot-toast-host");
    expect(host).not.toBeNull();
    expect(host?.style.right).toBe("20px");
    expect(host?.style.top).toBe("50%");
    expect(host?.style.transform).toBe("translateY(-50%)");

    vi.advanceTimersByTime(6_000);
    expect(document.getElementById("readslot-toast-host")).toBeNull();
    vi.useRealTimers();
  });
});
