import Link from "next/link";
import { monthAvailability } from "@/lib/booking";
import { getClosures, todayLocal } from "@/lib/closures";
import { getBookingRules, getHours } from "@/lib/content";
import { db } from "@/lib/db";
import { DAY_SHORT, DAY_KEYS, dayKeyOf, timeLabel } from "@/lib/hours";

/**
 * A month at a glance: which days still have room, which are taken, which we're closed.
 *
 * Rendered on the server from the same `monthAvailability()` the API and the admin
 * conflict check use. It shows times, never titles — a private booking is "Booked", not
 * somebody's name.
 */

const MONTH_LABEL = (month: string) => {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

function shiftMonth(month: string, by: number): string {
  const [year, index] = month.split("-").map(Number);
  const moved = new Date(Date.UTC(year, index - 1 + by, 1));
  return `${moved.getUTCFullYear()}-${String(moved.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function AvailabilityCalendar({ month, basePath }: { month: string; basePath: string }) {
  const today = todayLocal();
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

  const days = monthAvailability({ month, rules, hours, closures, events: results ?? [], today });

  // Blank cells so the first of the month lands under the right weekday.
  const lead = DAY_KEYS.indexOf(dayKeyOf(days[0].date));
  const thisMonth = today.slice(0, 7);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="h3">{MONTH_LABEL(month)}</h3>
        <p className="flex gap-4">
          {month > thisMonth ? (
            <Link href={`${basePath}?month=${shiftMonth(month, -1)}#availability`} className="link">
              ← Earlier
            </Link>
          ) : (
            <span style={{ color: "var(--muted)" }}>← Earlier</span>
          )}
          <Link href={`${basePath}?month=${shiftMonth(month, 1)}#availability`} className="link">
            Later →
          </Link>
        </p>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {DAY_KEYS.map((day) => (
          <p key={day} className="eyebrow pb-1" style={{ color: "var(--muted)" }}>
            {DAY_SHORT[day].slice(0, 1)}
          </p>
        ))}

        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} />
        ))}

        {days.map((day) => {
          const past = day.date < today;
          const number = Number(day.date.slice(8));
          const state = past
            ? "past"
            : day.closed
              ? "closed"
              : day.free.length === 0
                ? "full"
                : "open";

          const background =
            state === "open" ? "var(--paper)" : state === "full" ? "#efe6dc" : "transparent";
          const color = state === "open" ? "var(--ink)" : "var(--muted)";

          return (
            <div
              key={day.date}
              title={
                state === "open"
                  ? day.free.map((w) => `${timeLabel(w.open)}–${timeLabel(w.close)}`).join(", ")
                  : state === "full"
                    ? "Booked"
                    : state === "closed"
                      ? "Closed"
                      : ""
              }
              className="rounded-[2px] py-2 text-[14px]"
              style={{
                background,
                color,
                border: state === "open" ? "1px solid var(--line)" : "1px solid transparent",
                opacity: past ? 0.35 : 1,
                textDecoration: state === "closed" && !past ? "line-through" : undefined,
              }}
            >
              {number}
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px]" style={{ color: "var(--muted)" }}>
        <span>
          <span
            className="mr-2 inline-block h-[10px] w-[10px] align-middle"
            style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
          />
          Space free
        </span>
        <span>
          <span
            className="mr-2 inline-block h-[10px] w-[10px] align-middle"
            style={{ background: "#efe6dc" }}
          />
          Booked
        </span>
        <span>
          <s>00</s> Closed
        </span>
      </p>
      <p className="mt-3 text-[14px]" style={{ color: "var(--muted)" }}>
        A free day still needs confirming — send a request below and we&rsquo;ll come back to
        you. Times shown are what&rsquo;s left after the bookings already in the diary.
      </p>
    </div>
  );
}
