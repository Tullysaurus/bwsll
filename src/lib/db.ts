import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type Env = {
  DB?: D1Database;
  RESEND_API_KEY?: string;
  NOTIFY_TO?: string;
  NOTIFY_FROM?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  SITE_URL?: string;
  DEV_ADMIN?: string;
};

/**
 * Cloudflare bindings + vars. Falls back to `process.env` so `next dev` works before
 * anyone has run `wrangler d1 create` — D1-backed data then uses its defaults.
 */
export function env(): Env {
  try {
    return getCloudflareContext().env as unknown as Env;
  } catch {
    return process.env as unknown as Env;
  }
}

export function db(): D1Database | null {
  return env().DB ?? null;
}

/** Throws when D1 is missing — for writes, which must not silently no-op. */
export function requireDb(): D1Database {
  const database = db();
  if (!database) {
    throw new Error(
      "D1 binding `DB` is not available. Run `npx wrangler d1 create bwsll`, put the id in wrangler.jsonc, then `npm run db:migrate:local`.",
    );
  }
  return database;
}

export type EventKind = "public" | "private" | "catering";

export type EventRecord = {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  kind: EventKind;
  description: string | null;
  published: number;
  created_at: string;
};

export type InquiryStatus = "new" | "replied" | "booked" | "closed";
export type InquiryType = "event" | "catering" | "club" | "vendor" | "workforce" | "contact";

export type InquiryRecord = {
  id: number;
  type: InquiryType;
  name: string;
  email: string;
  phone: string | null;
  data: string;
  status: InquiryStatus;
  notes: string | null;
  created_at: string;
};

export type SubscriberRecord = { email: string; source: string | null; created_at: string };

/** Local-date string (America/Chicago) used to decide "upcoming" against `starts_at`. */
function nowLocalIso(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export async function getUpcomingEvents(limit?: number): Promise<EventRecord[]> {
  const database = db();
  if (!database) return [];
  const sql =
    "SELECT * FROM events WHERE published = 1 AND COALESCE(ends_at, starts_at) >= ?1 ORDER BY starts_at ASC" +
    (limit ? " LIMIT ?2" : "");
  const stmt = limit
    ? database.prepare(sql).bind(nowLocalIso(), limit)
    : database.prepare(sql).bind(nowLocalIso());
  const { results } = await stmt.all<EventRecord>();
  return results ?? [];
}

export async function getAllEvents(): Promise<EventRecord[]> {
  const database = db();
  if (!database) return [];
  const { results } = await database.prepare("SELECT * FROM events ORDER BY starts_at DESC").all<EventRecord>();
  return results ?? [];
}

export async function getEvent(id: number): Promise<EventRecord | null> {
  const database = db();
  if (!database) return null;
  return (await database.prepare("SELECT * FROM events WHERE id = ?1").bind(id).first<EventRecord>()) ?? null;
}

export function isPast(e: EventRecord): boolean {
  return (e.ends_at ?? e.starts_at) < nowLocalIso();
}

export async function listInquiries(opts: { status?: InquiryStatus; type?: InquiryType } = {}) {
  const database = db();
  if (!database) return [];
  const where: string[] = [];
  const binds: unknown[] = [];
  if (opts.status) {
    binds.push(opts.status);
    where.push(`status = ?${binds.length}`);
  }
  if (opts.type) {
    binds.push(opts.type);
    where.push(`type = ?${binds.length}`);
  }
  const sql = `SELECT * FROM inquiries ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC, id DESC`;
  const { results } = await database
    .prepare(sql)
    .bind(...binds)
    .all<InquiryRecord>();
  return results ?? [];
}

/** Recent booking requests, for the "autofill from an inquiry" picker on a new event. */
export async function listBookingInquiries(limit = 30): Promise<InquiryRecord[]> {
  const database = db();
  if (!database) return [];
  const { results } = await database
    .prepare(
      "SELECT * FROM inquiries WHERE type IN ('event','catering') ORDER BY created_at DESC, id DESC LIMIT ?1",
    )
    .bind(limit)
    .all<InquiryRecord>();
  return results ?? [];
}

export async function getInquiry(id: number): Promise<InquiryRecord | null> {
  const database = db();
  if (!database) return null;
  return (await database.prepare("SELECT * FROM inquiries WHERE id = ?1").bind(id).first<InquiryRecord>()) ?? null;
}

export async function countNewInquiries(): Promise<number> {
  const database = db();
  if (!database) return 0;
  const row = await database
    .prepare("SELECT COUNT(*) AS n FROM inquiries WHERE status = 'new'")
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function isSubscriber(email: string): Promise<boolean> {
  const database = db();
  if (!database) return false;
  const row = await database
    .prepare("SELECT email FROM subscribers WHERE email = ?1")
    .bind(email.toLowerCase())
    .first<{ email: string }>();
  return Boolean(row);
}

export async function listSubscribers(): Promise<SubscriberRecord[]> {
  const database = db();
  if (!database) return [];
  const { results } = await database
    .prepare("SELECT * FROM subscribers ORDER BY created_at DESC")
    .all<SubscriberRecord>();
  return results ?? [];
}
