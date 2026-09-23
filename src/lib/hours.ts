/**
 * Structured opening hours and dated closures.
 *
 * Everything here is pure and unit-tested — no database, no `server-only` — so the
 * labels the site prints, the JSON-LD it publishes and the banner it shows all come from
 * one description of the week instead of three hand-written strings.
 *
 * Times are "HH:MM" in America/Chicago; dates are "YYYY-MM-DD" in the same zone.
 */

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export type DayHours = { closed: true } | { closed?: false; open: string; close: string };
export type WeekHours = Record<DayKey, DayHours>;

export const DAY_NAME: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DAY_SHORT: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** JSON-LD uses two-letter codes. */
export const DAY_SCHEMA: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const defaultHours: WeekHours = {
  mon: { open: "07:00", close: "16:00" },
  tue: { open: "07:00", close: "16:00" },
  wed: { open: "07:00", close: "16:00" },
  thu: { open: "07:00", close: "16:00" },
  fri: { open: "07:00", close: "16:00" },
  sat: { open: "07:00", close: "16:00" },
  sun: { closed: true },
};

export function isClosed(day: DayHours): day is { closed: true } {
  return day.closed === true;
}

/** "07:00" → "7am"; "16:15" → "4:15pm". Minutes are shown only when they aren't :00. */
export function timeLabel(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return hhmm.trim();
  const hour24 = Number(match[1]);
  const minutes = match[2];
  const suffix = hour24 >= 12 ? "pm" : "am";
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minutes === "00" ? `${hour}${suffix}` : `${hour}:${minutes}${suffix}`;
}

export function dayLabel(day: DayHours): string {
  return isClosed(day) ? "Closed" : `${timeLabel(day.open)}–${timeLabel(day.close)}`;
}

function sameDay(a: DayHours, b: DayHours): boolean {
  return dayLabel(a) === dayLabel(b);
}

/**
 * Collapses *consecutive* days with identical times into ranges, so a normal week reads
 * "Monday–Saturday · 7am–4pm / Sunday · Closed" rather than seven rows.
 */
export function weeklyLabels(hours: WeekHours): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  let runStart = 0;

  for (let i = 0; i < DAY_KEYS.length; i += 1) {
    const next = DAY_KEYS[i + 1];
    const endsRun = !next || !sameDay(hours[DAY_KEYS[i]], hours[next]);
    if (!endsRun) continue;

    const from = DAY_KEYS[runStart];
    const to = DAY_KEYS[i];
    rows.push({
      label: from === to ? DAY_NAME[from] : `${DAY_NAME[from]}–${DAY_NAME[to]}`,
      value: dayLabel(hours[from]),
    });
    runStart = i + 1;
  }

  return rows;
}

/** "Mon–Sat · 7am–4pm" — the longest open stretch, for the bar at the top of the site. */
export function shortLabel(hours: WeekHours): string {
  const open = weeklyLabels(hours).filter((row) => row.value !== "Closed");
  if (!open.length) return "Closed";

  const row = open[0];
  const short = row.label
    .split("–")
    .map((name) => {
      const key = DAY_KEYS.find((day) => DAY_NAME[day] === name);
      return key ? DAY_SHORT[key] : name;
    })
    .join("–");
  return `${short} · ${row.value}`;
}

/* --- closures ------------------------------------------------------------- */

export type Closure = {
  id: number;
  start_date: string;
  end_date: string;
  /** 1 = closed all day; 0 = open, but with the special times below. */
  closed: number;
  open_time: string | null;
  close_time: string | null;
  note: string | null;
  deleted_at?: string | null;
};

function within(closure: Closure, date: string): boolean {
  return closure.start_date <= date && date <= closure.end_date;
}

/** The closure covering `date`, if any. Earliest start wins when two overlap. */
export function closureOn(closures: Closure[], date: string): Closure | undefined {
  return closures.filter((c) => within(c, date)).sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
}

/** What the doors actually do on a given date, closures applied. */
export function hoursOn(hours: WeekHours, closures: Closure[], date: string, day: DayKey): DayHours {
  const closure = closureOn(closures, date);
  if (!closure) return hours[day];
  if (closure.closed) return { closed: true };
  if (closure.open_time && closure.close_time) {
    return { open: closure.open_time, close: closure.close_time };
  }
  return hours[day];
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const moved = new Date(Date.UTC(y, m - 1, d + days));
  return moved.toISOString().slice(0, 10);
}

/** Day-of-week key for a "YYYY-MM-DD" date, read as a plain calendar date. */
export function dayKeyOf(date: string): DayKey {
  const [y, m, d] = date.split("-").map(Number);
  const index = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return DAY_KEYS[(index + 6) % 7];
}

/** "September 26" / "September 26–28" — how a closure is written in the banner. */
export function closureDates(closure: Closure): string {
  const label = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  };
  if (closure.start_date === closure.end_date) return label(closure.start_date);

  // Same month reads as "September 26–28"; across months, both months are named.
  const sameMonth = closure.start_date.slice(0, 7) === closure.end_date.slice(0, 7);
  const end = sameMonth ? String(Number(closure.end_date.slice(8, 10))) : label(closure.end_date);
  return `${label(closure.start_date)}–${end}`;
}

/**
 * The line the top bar shows for a closure: today's, or one starting within the next
 * week. Returns nothing when there's nothing to say, so the normal message stays up.
 */
export function closureBanner(closures: Closure[], today: string, withinDays = 7): string {
  const live = closures.filter((c) => !c.deleted_at);
  const now = closureOn(live, today);
  if (now) {
    const what = now.closed ? "Closed today" : `Open ${timeLabel(now.open_time ?? "")}–${timeLabel(now.close_time ?? "")} today`;
    return now.note ? `${what} — ${now.note}` : what;
  }

  const horizon = addDays(today, withinDays);
  const soon = live
    .filter((c) => c.start_date > today && c.start_date <= horizon)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  if (!soon) return "";

  const what = soon.closed ? `Closed ${closureDates(soon)}` : `Special hours ${closureDates(soon)}`;
  return soon.note ? `${what} — ${soon.note}` : what;
}
