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

export type ActivityRow = { name: string; count: number; before: number };
export type SiteActivity = { days: number; total: number; before: number; rows: ActivityRow[] };

/**
 * One month, each action counted, next to the month before it so there's something to
 * compare against. Two numbers per row is as much history as this screen needs: a week
 * of a café's website is a handful of taps, and a run of near-empty bars told the owner
 * nothing except that the numbers were small.
 */
export async function recentActivity(days = 30): Promise<SiteActivity> {
  const empty: SiteActivity = { days, total: 0, before: 0, rows: [] };
  const database = db();
  if (!database) return empty;

  let rows: { name: string; count: number; before: number }[] = [];
  try {
    const { results } = await database
      .prepare(
        `SELECT name,
                SUM(CASE WHEN created_at >= datetime('now', ?1) THEN 1 ELSE 0 END) AS count,
                SUM(CASE WHEN created_at <  datetime('now', ?1) THEN 1 ELSE 0 END) AS before
         FROM analytics_events
         WHERE created_at >= datetime('now', ?2)
         GROUP BY name
         ORDER BY count DESC, name`,
      )
      .bind(`-${days} days`, `-${days * 2} days`)
      .all<{ name: string; count: number; before: number }>();
    rows = results ?? [];
  } catch {
    return empty;
  }

  return {
    days,
    total: rows.reduce((sum, row) => sum + row.count, 0),
    before: rows.reduce((sum, row) => sum + row.before, 0),
    rows: rows.filter((row) => row.count > 0),
  };
}
