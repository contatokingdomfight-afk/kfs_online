import { describe, expect, it } from "vitest";
import { buildExamSlots, canSelfBook, canSelfChange, countBySlot } from "./exam-slots";

describe("buildExamSlots", () => {
  it("splits the window into whole slots", () => {
    const slots = buildExamSlots({ scheduledAt: "2026-11-08T10:00:00Z", endsAt: "2026-11-08T11:45:00Z", slotMinutes: 30, slotCapacity: 2 });
    expect(slots).toEqual(["2026-11-08T10:00:00.000Z", "2026-11-08T10:30:00.000Z", "2026-11-08T11:00:00.000Z"]);
  });

  it("returns nothing for events without slots", () => {
    expect(buildExamSlots({ scheduledAt: "2026-11-08T10:00:00Z", endsAt: null, slotMinutes: null, slotCapacity: null })).toEqual([]);
  });
});

describe("cutoffs", () => {
  const now = new Date("2026-11-06T10:00:00Z");
  it("allows changes only 48h or more before the slot", () => {
    expect(canSelfChange("2026-11-08T10:00:00Z", now)).toBe(true);
    expect(canSelfChange("2026-11-08T09:59:00Z", now)).toBe(false);
  });
  it("allows new bookings until 24h before the slot", () => {
    expect(canSelfBook("2026-11-07T10:00:00Z", now)).toBe(true);
    expect(canSelfBook("2026-11-07T09:00:00Z", now)).toBe(false);
  });
});

describe("countBySlot", () => {
  it("matches slots regardless of ISO format", () => {
    const map = countBySlot([{ slotStartsAt: "2026-11-08T10:00:00+00:00" }, { slotStartsAt: "2026-11-08T10:00:00.000Z" }, { slotStartsAt: null }]);
    expect(map.get(new Date("2026-11-08T10:00:00Z").getTime())).toBe(2);
  });
});
