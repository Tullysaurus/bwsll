import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { EventList } from "@/components/EventRow";
import { JsonLd } from "@/components/JsonLd";
import { PageIntro } from "@/components/Typography";
import { events as copy } from "@/content/copy";
import { getUpcomingEvents, type EventKind } from "@/lib/db";
import { eventJsonLd } from "@/lib/jsonld";
import { monthYearKey, monthYearLabel } from "@/lib/format";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Events",
  description: "Live music, conversations and community gatherings at Black Wall Street Liquid Lounge in Tulsa.",
  alternates: { canonical: "/events" },
};

const FILTERS: { label: string; kind?: EventKind }[] = [
  { label: "All" },
  { label: "Open to all", kind: "public" },
  { label: "Private", kind: "private" },
  { label: "Catering", kind: "catering" },
];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const activeKind = FILTERS.find((f) => f.kind === kind)?.kind;
  const all = await getUpcomingEvents();
  const shown = activeKind ? all.filter((e) => e.kind === activeKind) : all;

  // Group into months, preserving the ascending order the query returned.
  const months = new Map<string, typeof shown>();
  for (const event of shown) {
    const key = monthYearKey(event.starts_at);
    const bucket = months.get(key);
    if (bucket) bucket.push(event);
    else months.set(key, [event]);
  }

  return (
    <>
      {all
        .filter((event) => event.kind === "public")
        .map((event) => (
          <JsonLd key={event.id} data={eventJsonLd(event, siteUrl())} />
        ))}

      <PageIntro
        eyebrow={copy.eyebrow}
        titleStart={copy.h1a}
        titleItalic={copy.h1b}
        intro={copy.intro}
      />

      <div className="shell gutter">
        <ul className="no-scrollbar -mx-1 flex list-none gap-3 overflow-x-auto px-1 pb-2">
          {FILTERS.map((filter) => {
            const isActive = filter.kind === activeKind;
            return (
              <li key={filter.label}>
                <Link
                  href={filter.kind ? `/events?kind=${filter.kind}` : "/events"}
                  className="chip"
                  aria-current={isActive ? "true" : undefined}
                  scroll={false}
                >
                  {filter.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <section className="shell gutter pb-16 pt-10 md:pb-24">
        <h2 className="sr-only">Upcoming events</h2>
        {months.size === 0 ? (
          <p className="rule-top-ink pt-8 text-[17px]" style={{ color: "var(--muted)" }}>
            {copy.empty}
          </p>
        ) : (
          [...months.entries()].map(([key, list]) => (
            <div key={key} className="mb-12">
              <h3 className="h2 mb-6" style={{ fontSize: 36 }}>
                {monthYearLabel(list[0].starts_at)}
              </h3>
              <EventList events={list} emptyMessage={copy.empty} />
            </div>
          ))
        )}
      </section>

      <section className="section" style={{ background: "var(--paper)" }}>
        <div className="shell gutter flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="h2">Want to host something here?</h2>
          <Button href="/private-events#inquire">Plan an event</Button>
        </div>
      </section>
    </>
  );
}
