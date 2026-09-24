import type { WeekCount } from "@/lib/analytics";

/**
 * Six months of weekly totals, drawn as inline SVG.
 *
 * No chart library: it would be the largest dependency in the project, for one bar
 * chart that never needs to be interactive. The bars are a list with a label each, so a
 * screen reader gets the numbers rather than a picture of them.
 */
export function ActivityChart({ weeks }: { weeks: WeekCount[] }) {
  const max = Math.max(1, ...weeks.map((week) => week.count));
  const total = weeks.reduce((sum, week) => sum + week.count, 0);

  const width = 640;
  const height = 120;
  const gap = 2;
  const barWidth = Math.max(2, width / weeks.length - gap);

  if (!total) {
    return (
      <p className="mt-3 text-[15px]" style={{ color: "var(--muted)" }}>
        Nothing counted yet. Numbers start appearing once people use the site.
      </p>
    );
  }

  return (
    <figure className="mt-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`${total} actions over the last ${weeks.length} weeks`}
        style={{ display: "block" }}
      >
        {weeks.map((week, index) => {
          const barHeight = Math.round((week.count / max) * (height - 8));
          return (
            <rect
              key={week.week}
              x={index * (barWidth + gap)}
              y={height - barHeight}
              width={barWidth}
              height={barHeight}
              rx={1}
              fill="var(--green)"
            >
              <title>{`Week of ${week.week}: ${week.count}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex justify-between text-[13px]" style={{ color: "var(--muted)" }}>
        <span>{weeks.length} weeks ago</span>
        <span>
          {total} in total · busiest week {max}
        </span>
        <span>This week</span>
      </figcaption>
    </figure>
  );
}
