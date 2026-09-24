import { isMonth, monthAvailability } from "@/lib/booking";
import { getClosures, todayLocal } from "@/lib/closures";
import { getBookingRules, getHours } from "@/lib/content";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * What's free in one month, as times only.
 *
 * Public, so it says nothing about *who* has the room: event titles never leave the
 * server, and unpublished bookings count as busy without being named. One month per
 * request, and the parameter is validated rather than interpolated.
 */
export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") ?? todayLocal().slice(0, 7);
  if (!isMonth(month)) {
    return Response.json({ error: "Ask for one month, as YYYY-MM." }, { status: 400 });
  }

  const [rules, hours, closures] = await Promise.all([getBookingRules(), getHours(), getClosures()]);

  const database = db();
  const { results } = database
    ? await database
        .prepare(
          `SELECT starts_at, ends_at, uses_space FROM events
           WHERE deleted_at IS NULL AND uses_space = 1 AND starts_at LIKE ?1`,
        )
        .bind(`${month}%`)
        .all<{ starts_at: string; ends_at: string | null; uses_space: number }>()
    : { results: [] };

  const days = monthAvailability({
    month,
    rules,
    hours,
    closures,
    events: results ?? [],
    today: todayLocal(),
  });

  return Response.json(
    { month, days, rules: { minMinutes: rules.minMinutes, maxMinutes: rules.maxMinutes } },
    { headers: { "cache-control": "public, max-age=60, must-revalidate" } },
  );
}
