import { EVENT_LABEL, type SiteActivity, type TrackedEvent } from "@/lib/analytics";

/**
 * A month of activity, one row per thing people did.
 *
 * The bars are next to their own label and their own number, so the row reads as a
 * sentence — "phone number tapped, 48" — and the bar is only there to show which lines
 * are the big ones. It's marked aria-hidden for that reason: the number is the content.
 */
export function Activity({ activity }: { activity: SiteActivity }) {
  if (!activity.total) {
    return (
      <p className="mt-3 text-[16px]" style={{ color: "var(--muted)" }}>
        Nothing counted yet. Numbers start appearing once people use the site.
      </p>
    );
  }

  const max = Math.max(...activity.rows.map((row) => row.count));

  return (
    <div className="mt-4">
      <p className="text-[18px]">
        <strong>{activity.total}</strong> {activity.total === 1 ? "thing" : "things"} people
        did in the last {activity.days} days{compare(activity)}.
      </p>

      <ul className="mt-5 grid gap-4">
        {activity.rows.map((row) => (
          <li key={row.name}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[16px]">{EVENT_LABEL[row.name as TrackedEvent] ?? row.name}</span>
              <span className="text-[16px] font-medium tabular-nums">{row.count}</span>
            </div>
            <div
              aria-hidden
              className="mt-1 rounded-[2px]"
              style={{ height: 8, background: "var(--line)" }}
            >
              <div
                className="rounded-[2px]"
                style={{
                  width: `${Math.max(2, Math.round((row.count / max) * 100))}%`,
                  height: "100%",
                  background: "var(--green)",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Only worth saying when there's a month behind this one to compare against. */
function compare({ total, before }: SiteActivity): string {
  if (!before) return "";
  if (total > before) return ` — up from ${before} the month before`;
  if (total < before) return ` — down from ${before} the month before`;
  return " — the same as the month before";
}
