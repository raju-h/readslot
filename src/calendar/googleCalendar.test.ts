import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleCalendarGateway } from "./googleCalendar";

const chromeMock = (configured = true) => ({
  runtime: {
    getManifest: vi.fn(() => ({
      oauth2: configured ? { client_id: "test.apps.googleusercontent.com" } : undefined
    }))
  },
  identity: {
    getAuthToken: vi.fn(async () => ({ token: "test-auth-value" })),
    removeCachedAuthToken: vi.fn(async () => undefined)
  }
});

describe("GoogleCalendarGateway", () => {
  beforeEach(() => {
    vi.stubGlobal("chrome", chromeMock());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("fails safely when OAuth is not configured", async () => {
    vi.stubGlobal("chrome", chromeMock(false));
    const result = await new GoogleCalendarGateway().connect(false);
    expect(result).toEqual({
      ok: false,
      error: {
        code: "OAUTH_NOT_CONFIGURED",
        message: "Google Calendar is not configured for this build."
      }
    });
  });

  it("normalizes a successful FreeBusy response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              calendars: {
                primary: {
                  busy: [
                    {
                      start: "2026-07-14T12:00:00.000Z",
                      end: "2026-07-14T13:00:00.000Z"
                    }
                  ]
                }
              }
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
      )
    );
    const result = await new GoogleCalendarGateway().getBusy(
      ["primary"],
      "2026-07-14T00:00:00.000Z",
      "2026-07-15T00:00:00.000Z",
      "Asia/Dhaka"
    );
    expect(result.ok && result.value).toEqual([
      { start: "2026-07-14T12:00:00.000Z", end: "2026-07-14T13:00:00.000Z" }
    ]);
  });

  it("clears cached auth after a 401 without exposing the token", async () => {
    const mockedChrome = chromeMock();
    vi.stubGlobal("chrome", mockedChrome);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 401 }))
    );
    const result = await new GoogleCalendarGateway().listCalendars();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("OAUTH_REVOKED");
    expect(mockedChrome.identity.removeCachedAuthToken).toHaveBeenCalledWith({
      token: "test-auth-value"
    });
  });

  it("sends the caller-provided deterministic event ID", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            id: "readslot012345",
            start: { dateTime: "2026-07-14T12:00:00.000Z" },
            end: { dateTime: "2026-07-14T12:30:00.000Z" }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await new GoogleCalendarGateway().createEvent({
      eventId: "readslot012345",
      calendarId: "primary",
      title: "ReadSlot — 1 item",
      description: "Confirmed by the user.",
      start: "2026-07-14T12:00:00.000Z",
      end: "2026-07-14T12:30:00.000Z",
      timezone: "Asia/Dhaka",
      reminderMinutes: 10,
      transparency: "opaque",
      privateProperties: { readslotProposalId: "proposal-1" }
    });
    expect(result.ok).toBe(true);
    const request = fetchMock.mock.calls[0][1];
    expect(typeof request?.body).toBe("string");
    expect(JSON.parse(request?.body as string)).toMatchObject({ id: "readslot012345" });
  });
});
