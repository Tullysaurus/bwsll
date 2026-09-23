import "server-only";
import { cache } from "react";
import { db } from "./db";
import type { Closure } from "./hours";

/** Today in America/Chicago as YYYY-MM-DD — closures are calendar dates, not instants. */
export function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Closures that haven't finished yet, soonest first. One query per request. */
export const getClosures = cache(async (): Promise<Closure[]> => {
  const database = db();
  if (!database) return [];
  try {
    const { results } = await database
      .prepare(
        "SELECT * FROM closures WHERE deleted_at IS NULL AND end_date >= ?1 ORDER BY start_date ASC",
      )
      .bind(todayLocal())
      .all<Closure>();
    return results ?? [];
  } catch {
    // An un-migrated database must not take the public site down.
    return [];
  }
});

/** Everything, including past dates — the admin list. */
export async function listAllClosures(): Promise<Closure[]> {
  const database = db();
  if (!database) return [];
  const { results } = await database
    .prepare("SELECT * FROM closures WHERE deleted_at IS NULL ORDER BY start_date DESC")
    .all<Closure>();
  return results ?? [];
}
