/** Dates are stored as naive local strings ("2026-09-26T18:00") in America/Chicago. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function parseLocal(iso: string): { y: number; m: number; d: number; hh: number; mm: number } {
  const [date, time = "00:00"] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return { y, m, d, hh, mm };
}

/** Day of week without touching the host timezone (Sakamoto's algorithm). */
function dayOfWeek(y: number, m: number, d: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m < 3 ? y - 1 : y;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
}

export const monthAbbr = (iso: string) => MONTHS[parseLocal(iso).m - 1];
export const monthLong = (iso: string) => MONTHS_LONG[parseLocal(iso).m - 1];
export const dayNum = (iso: string) => String(parseLocal(iso).d);
export const dowAbbr = (iso: string) => {
  const { y, m, d } = parseLocal(iso);
  return DOW[dayOfWeek(y, m, d)];
};
export const monthYearKey = (iso: string) => iso.slice(0, 7);
export const monthYearLabel = (iso: string) => `${monthLong(iso)} ${parseLocal(iso).y}`;

export function timeLabel(iso: string): string {
  const { hh, mm } = parseLocal(iso);
  const period = hh >= 12 ? "pm" : "am";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm === 0 ? `${h12}${period}` : `${h12}:${String(mm).padStart(2, "0")}${period}`;
}

export function timeRange(startsAt: string, endsAt?: string | null): string {
  return endsAt ? `${timeLabel(startsAt)}–${timeLabel(endsAt)}` : timeLabel(startsAt);
}

export function longDate(iso: string): string {
  const { y, m, d } = parseLocal(iso);
  return `${MONTHS_LONG[m - 1]} ${d}, ${y}`;
}

/** "Sat, Sep 26 · 6pm–9pm" — used in admin lists and notification emails. */
export function fullEventLabel(startsAt: string, endsAt?: string | null): string {
  return `${dowAbbr(startsAt)}, ${monthAbbr(startsAt)} ${dayNum(startsAt)} · ${timeRange(startsAt, endsAt)}`;
}

/** Stored timestamps from SQLite `datetime('now')` are UTC — render them in Tulsa time. */
export function formatCreatedAt(sqliteUtc: string): string {
  const date = new Date(`${sqliteUtc.replace(" ", "T")}Z`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export const kindLabel: Record<string, string> = {
  public: "Open to all",
  private: "Private event",
  catering: "Off-site catering",
};

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * What visitors are allowed to see an event called. A booking made for someone else is
 * on the public calendar so the room reads as busy, but the client's name is theirs —
 * `hide_title` replaces it, and takes the description with it, since that often names
 * them too.
 */
export function publicEventTitle(event: { title: string; hide_title?: number }): string {
  return event.hide_title === 1 ? "Private event" : event.title;
}

export function publicEventDescription(event: {
  description?: string | null;
  hide_title?: number;
}): string | null {
  return event.hide_title === 1 ? null : (event.description ?? null);
}
