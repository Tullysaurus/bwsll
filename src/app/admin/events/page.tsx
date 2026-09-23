import Link from "next/link";
import { guardPage } from "../Guard";
import { getAllEvents, isPast } from "@/lib/db";
import { fullEventLabel, kindLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const { tab } = await searchParams;
  const showPast = tab === "past";
  const all = await getAllEvents();
  const rows = all
    .filter((event) => (showPast ? isPast(event) : !isPast(event)))
    .sort((a, b) => (showPast ? b.starts_at.localeCompare(a.starts_at) : a.starts_at.localeCompare(b.starts_at)));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display" style={{ fontSize: 32 }}>
          Events
        </h1>
        <Link href="/admin/events/new" className="btn btn-primary">
          New event
        </Link>
      </div>

      <ul className="mt-5 flex list-none gap-2">
        <li>
          <Link
            href="/admin/events"
            className="chip"
            style={{ minHeight: 38, padding: "8px 16px" }}
            aria-current={showPast ? undefined : "true"}
          >
            Upcoming
          </Link>
        </li>
        <li>
          <Link
            href="/admin/events?tab=past"
            className="chip"
            style={{ minHeight: 38, padding: "8px 16px" }}
            aria-current={showPast ? "true" : undefined}
          >
            Past
          </Link>
        </li>
      </ul>

      {rows.length === 0 ? (
        <p className="mt-8 text-[16px]" style={{ color: "var(--muted)" }}>
          No {showPast ? "past" : "upcoming"} events.
        </p>
      ) : (
        <ul className="rule-top-ink mt-6 list-none">
          {rows.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-baseline justify-between gap-3 py-4"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              <div>
                <Link href={`/admin/events/${event.id}`} className="display" style={{ fontSize: 20 }}>
                  {event.title}
                </Link>
                <p className="text-[14px]" style={{ color: "var(--muted)" }}>
                  {fullEventLabel(event.starts_at, event.ends_at)} · {event.location} · {kindLabel[event.kind]}
                </p>
              </div>
              <span className="pill" style={{ fontSize: 11, padding: "4px 10px" }}>
                {event.published ? "Published" : "Hidden"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
