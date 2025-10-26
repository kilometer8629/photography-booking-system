import { describe, it, expect } from "vitest";
import { buildSlotsForDay, filterSlots } from "../server/utils/slots";
import { DateTime } from "luxon";

describe("slots utility", () => {
  it("generates 72 five-minute slots between 10:00 and 16:00", () => {
    const { slots } = buildSlotsForDay("2025-10-01", {
      timezone: "Australia/Sydney",
      startHour: 10,
      endHour: 16,
      slotMinutes: 5,
    });

    expect(slots.length).toBe(72);
    expect(slots[0].label).toBe("10:00");
    expect(slots[slots.length - 1].label).toBe("15:55");
  });

  it("filters out busy intervals correctly", () => {
    const { slots } = buildSlotsForDay("2025-10-01", {
      timezone: "Australia/Sydney",
      startHour: 10,
      endHour: 11,
      slotMinutes: 5,
    });

    const anchor = DateTime.fromISO(slots[0].key, { zone: "Australia/Sydney" });
    const events = [
      {
        start: anchor.plus({ minutes: 10 }),
        end: anchor.plus({ minutes: 25 }),
      },
      {
        start: anchor.plus({ minutes: 40 }),
        end: anchor.plus({ minutes: 45 }),
      },
    ];

    const available = filterSlots(slots, events, {
      timezone: "Australia/Sydney",
      slotMinutes: 5,
    });

    expect(available).toEqual([
      "10:00",
      "10:05",
      "10:25",
      "10:30",
      "10:35",
      "10:45",
      "10:50",
      "10:55",
    ]);
  });
});
