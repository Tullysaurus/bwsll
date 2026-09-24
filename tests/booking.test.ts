import { describe, expect, it } from "vitest";
import {
  busyBlocks,
  conflicts,
  defaultBookingRules,
  freeWindows,
  isMonth,
  monthAvailability,
  openWindows,
  addMinutesToLocal,
  parseWindows,
  windowsToText,
  type BookingRules,
} from "@/lib/booking";
import { packagesToText, parsePackages } from "@/lib/catering-text";
import { defaultHours, type Closure } from "@/lib/hours";

const rules: BookingRules = defaultBookingRules;
const noClosures: Closure[] = [];

/** 2026-09-26 is a Saturday; 2026-09-27 a Sunday. */
const SATURDAY = "2026-09-26";
const SUNDAY = "2026-09-27";

const event = (over: Partial<Parameters<typeof busyBlocks>[0][number]> = {}) => ({
  starts_at: `${SATURDAY}T12:00`,
  ends_at: `${SATURDAY}T14:00`,
  uses_space: 1,
  deleted_at: null,
  ...over,
});

describe("busyBlocks", () => {
  it("counts unpublished bookings and ignores off-site catering", () => {
    const blocks = busyBlocks(
      [event(), event({ starts_at: `${SATURDAY}T09:00`, ends_at: null, uses_space: 0 })],
      SATURDAY,
      rules,
    );
    expect(blocks).toEqual([{ start: "12:00", end: "14:00" }]);
  });

  it("gives an open-ended event the minimum length", () => {
    expect(busyBlocks([event({ ends_at: null })], SATURDAY, rules)).toEqual([
      { start: "12:00", end: "13:00" },
    ]);
  });

  it("ignores deleted events and other days", () => {
    expect(busyBlocks([event({ deleted_at: "2026-09-01" })], SATURDAY, rules)).toEqual([]);
    expect(busyBlocks([event()], SUNDAY, rules)).toEqual([]);
  });
});

describe("openWindows", () => {
  it("clips the daytime window to opening hours and keeps the evening one", () => {
    expect(openWindows(SATURDAY, rules, defaultHours, noClosures)).toEqual([
      { open: "07:00", close: "16:00" },
      { open: "17:00", close: "21:00" },
    ]);
  });

  it("has nothing on a day the café is closed", () => {
    expect(openWindows(SUNDAY, rules, defaultHours, noClosures)).toEqual([]);
  });

  it("has nothing on a closure, and follows a closure's special hours", () => {
    const closed: Closure = {
      id: 1,
      start_date: SATURDAY,
      end_date: SATURDAY,
      closed: 1,
      open_time: null,
      close_time: null,
      note: null,
    };
    expect(openWindows(SATURDAY, rules, defaultHours, [closed])).toEqual([]);

    const short: Closure = { ...closed, closed: 0, open_time: "09:00", close_time: "12:00" };
    expect(openWindows(SATURDAY, rules, defaultHours, [short])).toEqual([
      { open: "09:00", close: "12:00" },
      { open: "17:00", close: "21:00" },
    ]);
  });
});

describe("freeWindows", () => {
  it("cuts out a booking and its buffer either side", () => {
    const free = freeWindows([{ open: "07:00", close: "16:00" }], [{ start: "12:00", end: "14:00" }], rules);
    expect(free).toEqual([
      { open: "07:00", close: "11:30" },
      { open: "14:30", close: "16:00" },
    ]);
  });

  it("drops a gap too short to book", () => {
    // 09:30–10:00 is left between the two buffers: half an hour, under the hour minimum.
    const free = freeWindows(
      [{ open: "07:00", close: "16:00" }],
      [
        { start: "07:00", end: "09:00" },
        { start: "10:30", end: "16:00" },
      ],
      rules,
    );
    expect(free).toEqual([]);
  });

  it("leaves nothing when the day is taken end to end", () => {
    expect(freeWindows([{ open: "07:00", close: "16:00" }], [{ start: "07:00", end: "16:00" }], rules)).toEqual([]);
  });
});

describe("conflicts", () => {
  const now = "2026-09-01T09:00";
  const base = { rules, hours: defaultHours, closures: noClosures, events: [], now };

  it("accepts a slot inside a window with nothing booked", () => {
    expect(conflicts({ date: SATURDAY, start: "10:00", end: "12:00" }, base)).toEqual([]);
  });

  it("refuses a closed day", () => {
    expect(conflicts({ date: SUNDAY, start: "10:00", end: "12:00" }, base).map((c) => c.code)).toEqual([
      "closed",
    ]);
  });

  it("refuses a slot that straddles the end of a window", () => {
    const found = conflicts({ date: SATURDAY, start: "15:00", end: "17:30" }, base);
    expect(found.map((c) => c.code)).toContain("outside");
  });

  it("refuses an overlap, including inside the buffer", () => {
    const withEvent = { ...base, events: [event()] };
    expect(conflicts({ date: SATURDAY, start: "13:00", end: "15:00" }, withEvent).map((c) => c.code)).toContain(
      "overlap",
    );
    // 14:00 ends the booking; the 30-minute buffer runs to 14:30.
    expect(conflicts({ date: SATURDAY, start: "14:15", end: "15:15" }, withEvent).map((c) => c.code)).toContain(
      "overlap",
    );
    expect(conflicts({ date: SATURDAY, start: "14:30", end: "15:30" }, withEvent).map((c) => c.code)).not.toContain(
      "overlap",
    );
  });

  it("enforces length, notice and horizon", () => {
    expect(conflicts({ date: SATURDAY, start: "10:00", end: "10:30" }, base).map((c) => c.code)).toContain(
      "too-short",
    );
    expect(
      conflicts({ date: "2026-09-02", start: "10:00", end: "12:00" }, base).map((c) => c.code),
    ).toContain("notice");
    expect(
      conflicts({ date: "2028-09-02", start: "10:00", end: "12:00" }, base).map((c) => c.code),
    ).toContain("horizon");
  });

  it("rejects nonsense outright", () => {
    expect(conflicts({ date: "not-a-date", start: "10:00" }, base).map((c) => c.code)).toEqual(["invalid"]);
  });
});

describe("monthAvailability", () => {
  it("describes every day of the month, with past days closed", () => {
    const days = monthAvailability({
      month: "2026-09",
      rules,
      hours: defaultHours,
      closures: noClosures,
      events: [event()],
      today: "2026-09-20",
    });

    expect(days).toHaveLength(30);
    expect(days[0]).toEqual({ date: "2026-09-01", free: [], closed: true });

    const saturday = days.find((day) => day.date === SATURDAY)!;
    expect(saturday.free).toEqual([
      { open: "07:00", close: "11:30" },
      { open: "14:30", close: "16:00" },
      { open: "17:00", close: "21:00" },
    ]);

    expect(days.find((day) => day.date === SUNDAY)!.closed).toBe(true);
  });

  it("validates the month parameter", () => {
    expect(isMonth("2026-09")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("2026-9")).toBe(false);
    expect(isMonth("../etc")).toBe(false);
  });
});

describe("addMinutesToLocal", () => {
  it("rolls over midnight", () => {
    expect(addMinutesToLocal("2026-09-26T23:00", 120)).toBe("2026-09-27T01:00");
    expect(addMinutesToLocal("2026-09-26T09:00", 48 * 60)).toBe("2026-09-28T09:00");
  });
});

describe("editing the rules", () => {
  it("round-trips a day's windows and forgives loose typing", () => {
    expect(windowsToText([{ open: "07:00", close: "16:00" }, { open: "17:00", close: "21:00" }])).toBe(
      "07:00-16:00, 17:00-21:00",
    );
    expect(parseWindows("7:00-16:00, 17-21")).toEqual([
      { open: "07:00", close: "16:00" },
      { open: "17:00", close: "21:00" },
    ]);
  });

  it("drops anything that isn't a window", () => {
    expect(parseWindows("")).toEqual([]);
    expect(parseWindows("closed")).toEqual([]);
    // A window that ends before it starts would open the whole day up.
    expect(parseWindows("17:00-09:00")).toEqual([]);
  });
});

describe("catering packages", () => {
  it("reads a line into a package with a stable id", () => {
    const { value, issues } = parsePackages("Fruit Tray | Trays & sides | 40");
    expect(issues).toEqual([]);
    expect(value).toEqual([
      { id: "fruit-tray", name: "Fruit Tray", group: "Trays & sides", base: 40 },
    ]);
    expect(packagesToText(value)).toBe("Fruit Tray | Trays & sides | 40");
  });

  it("keeps two packages with the same name apart", () => {
    const { value } = parsePackages("Tray | A | 10\nTray | B | 20");
    expect(value.map((pkg) => pkg.id)).toEqual(["tray", "tray-2"]);
  });

  it("refuses a line without a price", () => {
    const { value, issues } = parsePackages("Fruit Tray | Trays | free");
    expect(value).toEqual([]);
    expect(issues[0].message).toContain("isn't a price");
  });
});
