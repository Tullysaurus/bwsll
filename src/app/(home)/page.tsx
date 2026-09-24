import type { Metadata } from "next";
import { ArrowLink, Button } from "@/components/Button";
import { EventList } from "@/components/EventRow";
import { InfoStrip } from "@/components/InfoStrip";
import { JsonLd } from "@/components/JsonLd";
import { OfferCard } from "@/components/OfferCard";
import { PhotoSlot } from "@/components/PhotoSlot";
import { Eyebrow, SectionHeading } from "@/components/Typography";
import { files } from "@/content/business";
import { featuredFrom } from "@/lib/menu-text";
import { getBusiness, getCopy, getHours, getMenu } from "@/lib/content";
import { getUpcomingEvents } from "@/lib/db";
import { cafeJsonLd } from "@/lib/jsonld";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Black Wall Street Liquid Lounge — Coffee in Tulsa's Greenwood District",
  description:
    "Roots Java coffee, house signatures named for Greenwood figures, private events and catering — inside the GEM at 609 E. Pine St., Tulsa.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [events, business, copy, hours, menu] = await Promise.all([
    getUpcomingEvents(4),
    getBusiness(),
    getCopy(),
    getHours(),
    getMenu(),
  ]);
  const featuredItems = featuredFrom(menu);
  const { home, workforceCurriculum } = copy;

  return (
    <>
      <JsonLd data={cafeJsonLd(business, hours, siteUrl())} />

      {/* 1 — Hero */}
      <section className="on-dark relative flex min-h-[600px] items-end md:min-h-[min(780px,88vh)]">
        {/* The slot keeps its own `relative` for the placeholder label, so it is the
            wrapper — not the slot — that is positioned behind the hero copy. The scrim
            and any photo credit live inside the slot, above the image. */}
        <div className="absolute inset-0">
          <PhotoSlot id="hero" priority overlay labelAlign="top" className="h-full w-full" />
        </div>
        <div className="shell gutter relative w-full pb-10 pt-24 md:pb-24">
          <Eyebrow gold className="hidden md:block">
            {home.hero.eyebrow}
          </Eyebrow>
          <Eyebrow gold className="md:hidden">
            {home.hero.eyebrowMobile}
          </Eyebrow>
          <h1 className="h1-hero mt-5" style={{ color: "var(--paper)" }}>
            {home.hero.h1a}
            <br className="hidden md:block" />{" "}
            <em className="italic">{home.hero.h1b}</em>
          </h1>
          <p
            className="mt-7 max-w-[560px] text-[17px] md:text-[19px]"
            style={{ color: "#E9DFD0", lineHeight: 1.6 }}
          >
            {home.hero.body}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button href="/menu" variant="onDarkSolid" className="w-full sm:w-auto">
              See the menu
            </Button>
            <span className="hidden sm:inline-flex">
              <Button href="/visit" variant="onDarkOutline">
                Plan your visit
              </Button>
            </span>
            <span className="sm:hidden">
              <Button href="/private-events" variant="onDarkOutline" fullWidth>
                Plan an event
              </Button>
            </span>
          </div>
        </div>
      </section>

      {/* 2 — Info strip */}
      <InfoStrip />

      {/* 3 — Menu teaser */}
      <section className="shell gutter section">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-24">
          <PhotoSlot
            id="home-menu"
            className="h-[380px] lg:h-[660px]"
            sizeHint={{ width: 552, height: 660 }}
          />
          <div>
            <Eyebrow>{home.menuTeaser.eyebrow}</Eyebrow>
            <h2 className="h2 mt-4">{home.menuTeaser.h2}</h2>
            <p className="mt-5 max-w-[520px] text-[17px]" style={{ color: "var(--muted)" }}>
              {home.menuTeaser.body}
            </p>

            <ul className="rule-top mt-9 list-none">
              {featuredItems.map((item, i) => (
                <li
                  key={item.name}
                  className={`flex items-baseline gap-4 py-4 ${i >= 4 ? "hidden md:flex" : "flex"}`}
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <span className="display" style={{ fontSize: 21 }}>
                    {item.name}
                  </span>
                  <span className="flex-1 text-[13px]" style={{ color: "var(--muted)" }}>
                    {item.group}
                  </span>
                  <span className="tnum text-[16px] font-medium">{item.price}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-6">
              <ArrowLink href="/menu">See the full menu</ArrowLink>
              <a href={files.menu} className="link-muted">
                Download PDF
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 4 — Offerings */}
      <section className="section" style={{ background: "var(--paper)" }}>
        <div className="shell gutter">
          <SectionHeading title={home.offerings.h2} intro={home.offerings.intro} />
          <div className="mt-12 grid gap-11 md:grid-cols-3 md:gap-8">
            {home.offerings.cards.map((card) => (
              <OfferCard
                key={card.slot}
                slot={card.slot}
                eyebrow={card.eyebrow}
                title={card.h3}
                body={card.body}
                link={card.link}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 5 — Events */}
      <section className="shell gutter section">
        <SectionHeading
          eyebrow="Events"
          title="Coming up at the Lounge"
          aside={<ArrowLink href="/events">Full calendar</ArrowLink>}
        />
        <div className="mt-10">
          <EventList
            events={events}
            emptyMessage={`No upcoming events posted — follow ${business.instagramHandle} for updates.`}
          />
        </div>
      </section>

      {/* 6 — Our story */}
      <section className="on-dark section" style={{ background: "var(--green)", color: "var(--paper)" }}>
        <div className="shell gutter grid gap-12 lg:grid-cols-2 lg:gap-24">
          <div>
            <Eyebrow gold>{home.story.eyebrow}</Eyebrow>
            <blockquote className="quote mt-5" style={{ color: "var(--paper)" }}>
              {home.story.quote}
            </blockquote>
            <p className="mt-7 max-w-[520px] text-[17px]" style={{ color: "var(--green-soft-text)" }}>
              {home.story.body}
            </p>
            <p className="mt-7">
              <ArrowLink href="/about" onDark>
                Read our story
              </ArrowLink>
            </p>
          </div>
          <PhotoSlot
            id="home-gem"
            className="hidden h-[560px] lg:block"
            sizeHint={{ width: 552, height: 560 }}
          />
        </div>
      </section>

      {/* 7 — Workforce (desktop only; the full version lives on /workforce) */}
      <section className="shell gutter section hidden md:block">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
          <div>
            <Eyebrow>{home.workforce.eyebrow}</Eyebrow>
            <h2 className="h2 mt-4">{home.workforce.h2}</h2>
            <p className="mt-5 max-w-[520px] text-[17px]" style={{ color: "var(--muted)" }}>
              {home.workforce.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button href="/workforce#apply">Apply to the program</Button>
              <Button href="/workforce#business-development" variant="secondary">
                Business development
              </Button>
            </div>
          </div>
          <ul className="rule-top grid list-none grid-cols-2 gap-x-10">
            {workforceCurriculum.map((row) => (
              <li
                key={row.n}
                className="flex items-baseline gap-4 py-5"
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <span className="display" style={{ fontSize: 18, color: "var(--green)" }}>
                  {row.n}
                </span>
                <span className="text-[17px] font-medium">{row.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

    </>
  );
}
