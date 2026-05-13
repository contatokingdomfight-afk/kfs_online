import { describe, expect, it } from "vitest";
import { parseEventTicketQrPayload } from "./parse-event-ticket-qr";

const TOKEN = "a".repeat(48);
const E1 = "evt-1";
const E2 = "evt-2";

describe("parseEventTicketQrPayload", () => {
  it("parses raw hex token for current event", () => {
    const r = parseEventTicketQrPayload(`  ${TOKEN}  `, E1);
    expect(r).toEqual({ ok: true, token: TOKEN.toLowerCase(), targetEventId: E1 });
  });

  it("parses full check-in URL and event id from path", () => {
    const url = `https://app.example.com/admin/eventos/${E2}/validar?token=${TOKEN}`;
    const r = parseEventTicketQrPayload(url, E1);
    expect(r).toEqual({ ok: true, token: TOKEN.toLowerCase(), targetEventId: E2 });
  });

  it("falls back to current event when URL has token but no valid path", () => {
    const url = `https://other.com/foo?token=${TOKEN}`;
    const r = parseEventTicketQrPayload(url, E1);
    expect(r).toEqual({ ok: true, token: TOKEN.toLowerCase(), targetEventId: E1 });
  });

  it("rejects garbage", () => {
    expect(parseEventTicketQrPayload("not-a-url", E1)).toEqual({ ok: false });
    expect(parseEventTicketQrPayload("a".repeat(47), E1)).toEqual({ ok: false });
  });
});
