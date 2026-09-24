import "server-only";
import { db } from "./db";
import type { TrackedEvent } from "./analytics-names";

/**
 * What people do on the site, counted.
 *
 * The whole record is a name from the list below and the path it happened on. No IP, no
 * user agent, no cookie, no identifier — nothing stored here can be traced back to a
 * person, which is what lets the privacy notice stay as short as it is.
 *
 * `/api/track` is public (it isn't behind the proxy), so the allowlist is the guard: an
 * unknown name is dropped rather than stored.
 */

export { TRACKED, EVENT_LABEL, isTracked, type TrackedEvent } from "./analytics-names";

/** Paths are stored as-is but capped, and anything odd is recorded as "/". */
export function cleanPath(raw: string): string {
  const path = raw.trim();
  if (!path.startsWith("/") || path.length > 120 || path.includes("://")) return "/";
  return path.split("?")[0];
}

export async function recordEvent(name: TrackedEvent, path: string): Promise<void> {
  const database = db();
  if (!database) return;
  try {
    await database
      .prepare("INSERT INTO analytics_events (name, path) VALUES (?1, ?2)")
      .bind(name, cleanPath(path))
      .run();
  } catch {
    // Counting is never worth failing a visitor's request over.
  }
}

export type WeekCount = { week: string; count: number };

/**
 * Six months of weekly totals. SQLite's %W counts weeks from Monday, which is what the
 * chart's bars are — one per week, oldest first, with empty weeks filled in so the gaps
 * are visible rather than collapsed.
 */
export async function weeklyTotals(weeks = 26): Promise<WeekCount[]> {
  const database = db();
  if (!database) return [];

  let rows: { week: string; count: number }[] = [];
  try {
    const { results } = await database
      .prepare(
        `SELECT strftime('%Y-%W', created_at) AS week, COUNT(*) AS count
         FROM analytics_events
         WHERE created_at >= datetime('now', ?1)
         GROUP BY week ORDER BY week`,
      )
      .bind(`-${weeks * 7} days`)
      .all<{ week: string; count: number }>();
    rows = results ?? [];
  } catch {
    return [];
  }

  const found = new Map(rows.map((row) => [row.week, row.count]));
  const out: WeekCount[] = [];
  const cursor = new Date();
  cursor.setUTCDate(cursor.getUTCDate() - (weeks - 1) * 7);

  for (let i = 0; i < weeks; i += 1) {
    out.push({ week: weekKey(cursor), count: found.get(weekKey(cursor)) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return out;
}

/** SQLite's `%Y-%W`: the year, and the week number counting from the first Monday. */
function weekKey(date: Date): string {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const firstDay = new Date(start).getUTCDay(); // 0 = Sunday
  const daysBeforeFirstMonday = (8 - (firstDay === 0 ? 7 : firstDay)) % 7;
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000);
  const week = Math.floor((dayOfYear - daysBeforeFirstMonday) / 7) + 1;
  return `${date.getUTCFullYear()}-${String(Math.max(0, week)).padStart(2, "0")}`;
}

export async function countsByName(days = 30): Promise<{ name: string; count: number }[]> {
  const database = db();
  if (!database) return [];
  try {
    const { results } = await database
      .prepare(
        `SELECT name, COUNT(*) AS count FROM analytics_events
         WHERE created_at >= datetime('now', ?1)
         GROUP BY name ORDER BY count DESC`,
      )
      .bind(`-${days} days`)
      .all<{ name: string; count: number }>();
    return results ?? [];
  } catch {
    return [];
  }
}
