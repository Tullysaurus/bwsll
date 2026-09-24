import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { CateringEstimator } from "@/components/CateringEstimator";
import { EstimateProvider } from "@/components/EstimateContext";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { InquiryForm } from "@/components/InquiryForm";
import { isMonth } from "@/lib/booking";
import { todayLocal } from "@/lib/closures";
import { PhotoSlot } from "@/components/PhotoSlot";
import { Eyebrow, SectionHeading } from "@/components/Typography";
import { files } from "@/content/business";
import { rentalRows, rentalTiers } from "@/content/catering";
import { getCatering, getCopy } from "@/lib/content";
import { getSettings, rateOrAsk } from "@/lib/settings";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "Private events & catering",
  description:
    "Rent the Liquid Lounge for meetings, workshops, showers and celebrations, or have us cater your event anywhere in Tulsa.",
  alternates: { canonical: "/private-events" },
};

export default async function PrivateEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const requested = (await searchParams).month ?? "";
  const month = isMonth(requested) ? requested : todayLocal().slice(0, 7);
  const [settings, { privateEvents }, catering] = await Promise.all([
    getSettings(),
    getCopy(),
    getCatering(),
  ]);
  const siteKey = turnstileSiteKey();
  const rates = settings.rental_rates;

  const rate = (row: "business" | "after", tier: "g10" | "g20" | "g40") => rateOrAsk(rates[row][tier]);

  return (
    <>
      {/* Hero */}
      <section className="grid lg:grid-cols-2" style={{ minHeight: 600 }}>
        <div className="order-2 flex flex-col justify-center gutter py-14 lg:order-1 lg:py-24 lg:pr-20">
          <Eyebrow>{privateEvents.eyebrow}</Eyebrow>
          <h1 className="h1-page mt-5">
            {privateEvents.h1a} <em className="italic">{privateEvents.h1b}</em>
          </h1>
          <p className="mt-6 max-w-[560px] body-lg" style={{ color: "var(--muted)" }}>
            {privateEvents.body}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button href="#inquire">Request a date</Button>
            <Button href="#catering" variant="secondary">
              Build a catering estimate
            </Button>
          </div>
        </div>
        <PhotoSlot
          id="events-hero"
          className="order-1 h-[280px] lg:order-2 lg:h-full"
          sizeHint={{ width: 720, height: 600 }}
        />
      </section>

      {/* Space rental */}
      <section className="shell gutter section">
        <SectionHeading title="Space rental" intro={privateEvents.rentalNote} />

        {/* Desktop table */}
        <table className="price-table rule-top-ink mt-10 hidden md:table">
          <caption className="sr-only">Space rental rates by group size</caption>
          <thead>
            <tr>
              <th scope="col" style={{ width: "34%" }}>
                <span className="sr-only">Time block</span>
              </th>
              {rentalTiers.map((tier) => (
                <th key={tier.id} scope="col" className="size-label">
                  {tier.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rentalRows.map((row) => (
              <tr key={row.id}>
                <th scope="row" style={{ fontWeight: 400 }}>
                  <span className="display block" style={{ fontSize: 28, lineHeight: 1.2 }}>
                    {row.title}
                  </span>
                  <span className="text-[15px]" style={{ color: "var(--muted)" }}>
                    {row.sub}
                  </span>
                </th>
                {rentalTiers.map((tier) => {
                  const value = rate(row.id, tier.id);
                  return (
                    <td key={tier.id}>
                      <span
                        className={value.isPlaceholder ? "text-[17px]" : "display"}
                        style={{
                          fontSize: value.isPlaceholder ? 17 : 28,
                          color: value.isPlaceholder ? "var(--muted)" : "inherit",
                        }}
                      >
                        {value.text}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile: one card per time block */}
        <div className="mt-8 grid gap-6 md:hidden">
          {rentalRows.map((row) => (
            <div key={row.id} className="rule-top-ink pt-4">
              <p className="display" style={{ fontSize: 24 }}>
                {row.title}
              </p>
              <p className="text-[15px]" style={{ color: "var(--muted)" }}>
                {row.sub}
              </p>
              <dl className="mt-3">
                {rentalTiers.map((tier) => {
                  const value = rate(row.id, tier.id);
                  return (
                    <div
                      key={tier.id}
                      className="flex items-baseline justify-between gap-4 py-3"
                      style={{ borderTop: "1px solid var(--line)" }}
                    >
                      <dt className="text-[15px]" style={{ color: "var(--muted)" }}>
                        {tier.label}
                      </dt>
                      <dd
                        className={value.isPlaceholder ? "" : "display"}
                        style={{
                          fontSize: value.isPlaceholder ? 15 : 24,
                          color: value.isPlaceholder ? "var(--muted)" : "inherit",
                        }}
                      >
                        {value.text}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </div>
      </section>

      {/* What's still free */}
      <section id="availability" className="section" style={{ background: "var(--paper)" }}>
        <div className="shell gutter">
          <div className="max-w-[620px]">
            <Eyebrow>Availability</Eyebrow>
            <h2 className="h2 mt-3">When the room is free.</h2>
          </div>
          <div className="mt-8 max-w-[620px]">
            <AvailabilityCalendar month={month} basePath="/private-events" />
          </div>
        </div>
      </section>

      <EstimateProvider>
        {/* Catering estimator */}
        <section id="catering" className="section" style={{ background: "var(--paper)" }}>
          <div className="shell gutter">
            <CateringEstimator catering={catering} />
          </div>
        </section>

        {/* Request a date */}
        <section id="inquire" className="shell gutter section">
          <div className="grid gap-12 lg:grid-cols-[1.55fr_1fr] lg:gap-20">
            <InquiryForm
              type="event"
              siteKey={siteKey}
              responseTime={settings.response_time}
              heading="Request a date"
              intro="We’ll reply by email with pricing and next steps."
            />

            <aside className="rule-top-ink pt-6 lg:self-start">
              <h3 className="h3">Good to know</h3>
              <ul className="mt-5 list-none">
                {catering.goodToKnow.map((item) => (
                  <li key={item} className="py-4 text-[16px]" style={{ borderTop: "1px solid var(--line)" }}>
                    {item}
                  </li>
                ))}
              </ul>
              <ul className="mt-5 flex list-none flex-col gap-3">
                <li>
                  <a href={files.rentalAgreement} className="link">
                    Private event rental agreement (PDF)
                  </a>
                </li>
                <li>
                  <a href={files.foodPricing} className="link">
                    Food &amp; beverage pricing (PDF)
                  </a>
                </li>
              </ul>
            </aside>
          </div>
        </section>
      </EstimateProvider>

      {/* Clears the mobile sticky estimate bar. */}
      <div className="h-24 lg:hidden" aria-hidden="true" />
    </>
  );
}
