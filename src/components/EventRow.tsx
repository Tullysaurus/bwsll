import type { EventRecord } from "@/lib/db";
import {
  dayNum,
  dowAbbr,
  kindLabel,
  monthAbbr,
  publicEventDescription,
  publicEventTitle,
  timeRange,
} from "@/lib/format";

/** §5.1.6 — date block · title · time+place · kind pill. */
export function EventRow({ event }: { event: EventRecord }) {
  const month = monthAbbr(event.starts_at).toUpperCase();
  const dow = dowAbbr(event.starts_at).toUpperCase();
  const title = publicEventTitle(event);
  const description = publicEventDescription(event);

  return (
    <li
      className="grid items-start gap-4 py-5 md:gap-8 md:py-[26px]"
      style={{ borderBottom: "1px solid var(--line)", gridTemplateColumns: "52px 1fr" }}
    >
      <div className="md:hidden">
        <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.16em", color: "var(--muted)" }}>
          {month}
        </p>
        <p className="display" style={{ fontSize: 36, lineHeight: 1 }}>
          {dayNum(event.starts_at)}
        </p>
      </div>
      <div className="md:hidden">
        <p className="display" style={{ fontSize: 20, lineHeight: 1.2 }}>
          {title}
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
          {timeRange(event.starts_at, event.ends_at)} · {event.location}
        </p>
      </div>

      <div
        className="col-span-2 hidden md:grid md:items-start md:gap-8"
        style={{ gridTemplateColumns: "120px 1fr 260px 180px" }}
      >
        <div>
          <p
            className="text-[12px] font-semibold uppercase"
            style={{ letterSpacing: "0.16em", color: "var(--muted)" }}
          >
            {month} · {dow}
          </p>
          <p className="display" style={{ fontSize: 52, lineHeight: 1 }}>
            {dayNum(event.starts_at)}
          </p>
        </div>
        <div>
          <p className="display" style={{ fontSize: 28, lineHeight: 1.2 }}>
            {title}
          </p>
          {description ? (
            <p className="mt-2 max-w-[520px] text-[15px]" style={{ color: "var(--muted)" }}>
              {description}
            </p>
          ) : null}
        </div>
        <p className="text-[15px] leading-[1.6]" style={{ color: "var(--muted)" }}>
          {timeRange(event.starts_at, event.ends_at)}
          <br />
          {event.location}
        </p>
        <div className="flex justify-end">
          <span className="pill">{kindLabel[event.kind]}</span>
        </div>
      </div>
    </li>
  );
}

export function EventList({ events, emptyMessage }: { events: EventRecord[]; emptyMessage: string }) {
  if (events.length === 0) {
    return (
      <p className="rule-top-ink pt-8 text-[17px]" style={{ color: "var(--muted)" }}>
        {emptyMessage}
      </p>
    );
  }
  return (
    <ul className="rule-top-ink list-none">
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </ul>
  );
}
