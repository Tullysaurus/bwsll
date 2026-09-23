import { describe, expect, it } from "vitest";
import {
  closureBanner,
  closureDates,
  dayKeyOf,
  defaultHours,
  hoursOn,
  shortLabel,
  timeLabel,
  weeklyLabels,
  type Closure,
  type WeekHours,
} from "@/lib/hours";
import { fieldsOf, parseShape } from "@/lib/shape-form";

const closure = (over: Partial<Closure>): Closure => ({
  id: 1,
  start_date: "2026-09-26",
  end_date: "2026-09-26",
  closed: 1,
  open_time: null,
  close_time: null,
  note: null,
  deleted_at: null,
  ...over,
});

describe("time labels", () => {
  it("drops :00 and keeps real minutes", () => {
    expect(timeLabel("07:00")).toBe("7am");
    expect(timeLabel("16:15")).toBe("4:15pm");
    expect(timeLabel("12:00")).toBe("12pm");
    expect(timeLabel("00:30")).toBe("12:30am");
  });
});

describe("weeklyLabels", () => {
  it("collapses consecutive days that match", () => {
    expect(weeklyLabels(defaultHours)).toEqual([
      { label: "Monday–Saturday", value: "7am–4pm" },
      { label: "Sunday", value: "Closed" },
    ]);
  });

  it("does not collapse across a different day in the middle", () => {
    const hours: WeekHours = {
      ...defaultHours,
      wed: { closed: true },
    };
    expect(weeklyLabels(hours).map((row) => row.label)).toEqual([
      "Monday–Tuesday",
      "Wednesday",
      "Thursday–Saturday",
      "Sunday",
    ]);
  });

  it("gives the short bar label from the first open stretch", () => {
    expect(shortLabel(defaultHours)).toBe("Mon–Sat · 7am–4pm");
    expect(shortLabel({ ...defaultHours, mon: { closed: true } })).toBe("Tue–Sat · 7am–4pm");
  });
});

describe("closures", () => {
  it("announces today's closure with its reason", () => {
    const banner = closureBanner([closure({ note: "Juneteenth" })], "2026-09-26");
    expect(banner).toBe("Closed today — Juneteenth");
  });

  it("announces one starting within the week, and ignores one further out", () => {
    const soon = [closure({ start_date: "2026-09-30", end_date: "2026-09-30" })];
    expect(closureBanner(soon, "2026-09-26")).toBe("Closed September 30");
    expect(closureBanner(soon, "2026-09-01")).toBe("");
  });

  it("says nothing for a deleted closure", () => {
    expect(closureBanner([closure({ deleted_at: "2026-09-01" })], "2026-09-26")).toBe("");
  });

  it("writes a range as one label", () => {
    expect(closureDates(closure({ end_date: "2026-09-28" }))).toBe("September 26–28");
  });

  it("overrides the week's hours on the day it covers", () => {
    const special = closure({ closed: 0, open_time: "09:00", close_time: "12:00" });
    expect(hoursOn(defaultHours, [special], "2026-09-26", "sat")).toEqual({
      open: "09:00",
      close: "12:00",
    });
    expect(hoursOn(defaultHours, [special], "2026-09-25", "fri")).toEqual(defaultHours.fri);
  });

  it("reads the weekday off a plain date", () => {
    expect(dayKeyOf("2026-09-26")).toBe("sat");
    expect(dayKeyOf("2026-09-27")).toBe("sun");
  });
});

describe("shape forms", () => {
  const defaults = {
    hero: { title: "Beyond coffee", body: "x".repeat(120) },
    benefits: ["One", "Two"],
    rows: [{ label: "A" }],
  };

  it("walks the shape into named fields", () => {
    const fields = fieldsOf(defaults);
    expect(fields.map((f) => [f.path, f.kind])).toEqual([
      ["hero.title", "text"],
      ["hero.body", "textarea"],
      ["benefits", "lines"],
      ["rows.0.label", "text"],
    ]);
  });

  it("rebuilds the same shape and keeps untouched keys", () => {
    const form = new Map<string, string>([
      ["hero.title", "  New title  "],
      ["benefits", "First\n\nSecond\n"],
    ]);
    const result = parseShape(defaults, { get: (name) => form.get(name) });
    expect(result).toEqual({
      hero: { title: "New title", body: defaults.hero.body },
      benefits: ["First", "Second"],
      rows: [{ label: "A" }],
    });
  });

  it("ignores form fields the defaults don't describe", () => {
    const form = new Map<string, string>([["hero.injected", "nope"]]);
    const result = parseShape(defaults, { get: (name) => form.get(name) }) as Record<string, unknown>;
    expect(Object.keys(result.hero as object)).toEqual(["title", "body"]);
  });
});
