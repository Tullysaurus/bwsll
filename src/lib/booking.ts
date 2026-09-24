import {
  addDays,
  dayKeyOf,
  isClosed,
  timeLabel,
  type Closure,
  type DayKey,
  type WeekHours,
} from "./hours";

/**
 * Whether the room is free, and what "free" means.
 *
 * Everything here is pure and unit-tested, because three places have to agree about it:
 * the public availability calendar, the re-check when a request comes in, and the
 * conflict warning when staff put an event on the calendar. A disagreement between them
 * is a double-booking.
 *
 * Times are "HH:MM" and dates "YYYY-MM-DD", both local to America/Chicago, matching the
 * naive local timestamps events are stored with.
 */

export type Window = { open: string; close: string };
export type Block = { start: string; end: string };

export type BookingRules = {
  /** When the room can be booked, per weekday. Empty = not bookable that day. */
  windows: Record<DayKey, Window[]>;
  /** Minutes of turnaround kept clear either side of a booking. */
  bufferMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  /** How far ahead a date can be requested. */
  horizonDays: number;
  /** How much warning a request needs. */
  noticeHours: number;
};

const BUSINESS: Window[] = [{ open: "07:00", close: "16:00" }];
const AFTER: Window[] = [{ open: "17:00", close: "21:00" }];

export const defaultBookingRules: BookingRules = {
  windows: {
    mon: [...BUSINESS, ...AFTER],
    tue: [...BUSINESS, ...AFTER],
    wed: [...BUSINESS, ...AFTER],
    thu: [...BUSINESS, ...AFTER],
    fri: [...BUSINESS, ...AFTER],
    sat: [...BUSINESS, ...AFTER],
    sun: [],
  },
  bufferMinutes: 30,
  minMinutes: 60,
  maxMinutes: 480,
  horizonDays: 365,
  noticeHours: 48,
};

/* --- minutes helpers -------------------------------------------------------- */

export function toMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function toClock(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** "2026-09-26T18:00" → { date, time }. Anything else is ignored by the callers. */
export function splitLocal(iso: string): { date: string; time: string } {
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/* --- what's already taken --------------------------------------------------- */

type EventLike = {
  starts_at: string;
  ends_at: string | null;
  uses_space?: number;
  deleted_at?: string | null;
};

/**
 * The times the room is taken. Unpublished events count — a draft booking still
 * occupies the room — and nothing about the event other than its times is returned, so
 * this is safe to serve publicly.
 */
export function busyBlocks(events: EventLike[], date: string, rules: BookingRules): Block[] {
  return events
    .filter((event) => !event.deleted_at && (event.uses_space ?? 1) === 1)
    .filter((event) => event.starts_at.slice(0, 10) === date)
    .map((event) => {
      const start = toMinutes(splitLocal(event.starts_at).time);
      const end = event.ends_at
        ? toMinutes(splitLocal(event.ends_at).time)
        : start + rules.minMinutes;
      return { start: toClock(start), end: toClock(Number.isNaN(end) ? start + rules.minMinutes : end) };
    })
    .filter((block) => !Number.isNaN(toMinutes(block.start)))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/* --- when the room could be booked ------------------------------------------ */

/**
 * The bookable windows on a date: the weekday's rules, narrowed to the hours the café
 * is actually open that day, with closures applied. A closed day has none.
 */
export function openWindows(
  date: string,
  rules: BookingRules,
  hours: WeekHours,
  closures: Closure[],
): Window[] {
  const day: DayKey = dayKeyOf(date);
  const closure = closures.find(
    (item) => !item.deleted_at && item.start_date <= date && date <= item.end_date,
  );
  if (closure?.closed) return [];

  const opening = closure && closure.open_time && closure.close_time
    ? { open: closure.open_time, close: closure.close_time }
    : hours[day];
  if (isClosed(opening)) return [];

  const dayOpen = toMinutes(opening.open);
  const dayClose = toMinutes(opening.close);

  return (rules.windows[day] ?? [])
    .map((window) => {
      // After-hours windows sit outside opening hours on purpose, so only windows that
      // overlap the trading day are clipped to it.
      const start = toMinutes(window.open);
      const end = toMinutes(window.close);
      if (start >= dayClose || end <= dayOpen) return window;
      return { open: toClock(Math.max(start, dayOpen)), close: toClock(Math.min(end, dayClose)) };
    })
    .filter((window) => toMinutes(window.close) - toMinutes(window.open) >= rules.minMinutes);
}

/** Bookable windows with the busy blocks (plus their buffer) cut out of them. */
export function freeWindows(windows: Window[], busy: Block[], rules: BookingRules): Window[] {
  let free = windows.map((window) => ({ start: toMinutes(window.open), end: toMinutes(window.close) }));

  for (const block of busy) {
    const from = toMinutes(block.start) - rules.bufferMinutes;
    const to = toMinutes(block.end) + rules.bufferMinutes;
    free = free.flatMap((span) => {
      if (to <= span.start || from >= span.end) return [span];
      const pieces: { start: number; end: number }[] = [];
      if (from > span.start) pieces.push({ start: span.start, end: from });
      if (to < span.end) pieces.push({ start: to, end: span.end });
      return pieces;
    });
  }

  return free
    .filter((span) => span.end - span.start >= rules.minMinutes)
    .map((span) => ({ open: toClock(span.start), close: toClock(span.end) }));
}

/* --- editing the rules ------------------------------------------------------ */

/** "07:00-16:00, 17:00-21:00" — how a day's bookable windows are typed in the admin. */
export function windowsToText(windows: Window[]): string {
  return windows.map((window) => `${window.open}-${window.close}`).join(", ");
}

export function parseWindows(raw: string): Window[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split(/[-–]/).map((piece) => piece.trim()))
    .filter((pair) => pair.length === 2)
    .map(([open, close]) => ({ open: normalise(open), close: normalise(close) }))
    .filter((window) => {
      const from = toMinutes(window.open);
      const to = toMinutes(window.close);
      return !Number.isNaN(from) && !Number.isNaN(to) && to > from;
    });
}

/** "7:00" and "7" both mean 07:00. */
function normalise(value: string): string {
  const bare = /^(\d{1,2})$/.exec(value.trim());
  if (bare) return toClock(Number(bare[1]) * 60);
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : value.trim();
}

/* --- can this request be taken? --------------------------------------------- */

export type Candidate = { date: string; start: string; end?: string };

export type Conflict = {
  code: "closed" | "outside" | "overlap" | "too-short" | "too-long" | "notice" | "horizon" | "invalid";
  message: string;
};

/**
 * Every reason a requested slot can't be taken, in the words the person asking should
 * see. An empty list means the room is free.
 */
export function conflicts(
  candidate: Candidate,
  input: {
    rules: BookingRules;
    hours: WeekHours;
    closures: Closure[];
    events: EventLike[];
    /** "now" as a local ISO string, for notice and horizon. */
    now: string;
  },
): Conflict[] {
  const { rules, hours, closures, events, now } = input;
  const found: Conflict[] = [];

  const start = toMinutes(candidate.start);
  const end = candidate.end ? toMinutes(candidate.end) : start + rules.minMinutes;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.date) || Number.isNaN(start) || Number.isNaN(end)) {
    return [{ code: "invalid", message: "That date and time didn't make sense." }];
  }

  const length = end - start;
  if (length < rules.minMinutes) {
    found.push({ code: "too-short", message: `Bookings run at least ${describeMinutes(rules.minMinutes)}.` });
  }
  if (length > rules.maxMinutes) {
    found.push({ code: "too-long", message: `Bookings run at most ${describeMinutes(rules.maxMinutes)}.` });
  }

  const today = now.slice(0, 10);
  const noticeUntil = addMinutesToLocal(now, rules.noticeHours * 60);
  if (`${candidate.date}T${toClock(start)}` < noticeUntil) {
    found.push({
      code: "notice",
      message: `We need at least ${describeMinutes(rules.noticeHours * 60)} notice.`,
    });
  }
  if (candidate.date > addDays(today, rules.horizonDays)) {
    found.push({ code: "horizon", message: "That's further ahead than we book." });
  }

  const windows = openWindows(candidate.date, rules, hours, closures);
  if (windows.length === 0) {
    found.push({ code: "closed", message: "We're closed that day." });
    return found;
  }

  const inside = windows.some(
    (window) => start >= toMinutes(window.open) && end <= toMinutes(window.close),
  );
  if (!inside) {
    found.push({
      code: "outside",
      message: `That day we book ${windows.map((w) => `${timeLabel(w.open)}–${timeLabel(w.close)}`).join(" and ")}.`,
    });
  }

  const busy = busyBlocks(events, candidate.date, rules);
  const clash = busy.find(
    (block) =>
      start < toMinutes(block.end) + rules.bufferMinutes &&
      end > toMinutes(block.start) - rules.bufferMinutes,
  );
  if (clash) {
    found.push({
      code: "overlap",
      message: `Something else is in the room ${timeLabel(clash.start)}–${timeLabel(clash.end)}.`,
    });
  }

  return found;
}

export function describeMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  const whole = Math.floor(hours);
  const rest = minutes - whole * 60;
  const hourLabel = `${whole} hour${whole === 1 ? "" : "s"}`;
  return rest ? `${hourLabel} ${rest} minutes` : hourLabel;
}

/** Adds minutes to a naive local "YYYY-MM-DDTHH:MM", rolling the date over as needed. */
export function addMinutesToLocal(iso: string, minutes: number): string {
  const { date, time } = splitLocal(iso);
  const total = toMinutes(time || "00:00") + minutes;
  const days = Math.floor(total / (24 * 60));
  const rest = total - days * 24 * 60;
  return `${addDays(date, days)}T${toClock(rest)}`;
}

/** Each day of a month with what's left of it — what the public calendar draws. */
export type DayAvailability = {
  date: string;
  /** Free windows, after opening hours, closures and existing bookings. */
  free: Window[];
  closed: boolean;
};

export function monthAvailability(input: {
  month: string;
  rules: BookingRules;
  hours: WeekHours;
  closures: Closure[];
  events: EventLike[];
  today: string;
}): DayAvailability[] {
  const { month, rules, hours, closures, events, today } = input;
  const [year, monthIndex] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();

  const out: DayAvailability[] = [];
  for (let day = 1; day <= days; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    if (date < today) {
      out.push({ date, free: [], closed: true });
      continue;
    }
    const windows = openWindows(date, rules, hours, closures);
    const free = freeWindows(windows, busyBlocks(events, date, rules), rules);
    out.push({ date, free, closed: windows.length === 0 });
  }
  return out;
}

/** Guards the public `?month=` parameter. */
export function isMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}
