import type { Metadata } from "next";
import { ArrowLink, Button } from "@/components/Button";
import { InquiryForm } from "@/components/InquiryForm";
import { JsonLd } from "@/components/JsonLd";
import { PhotoSlot } from "@/components/PhotoSlot";
import { Eyebrow } from "@/components/Typography";
import { business, socialLinks } from "@/content/business";
import { visit } from "@/content/copy";
import { cafeJsonLd } from "@/lib/jsonld";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/site";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "Visit & contact",
  description:
    "Find Black Wall Street Liquid Lounge at 609 E. Pine St., Tulsa — inside the GEM. Hours, directions, phone and email.",
  alternates: { canonical: "/visit" },
};

export default async function VisitPage() {
  const settings = await getSettings();

  return (
    <>
      <JsonLd data={cafeJsonLd(settings.hours, siteUrl())} />

      <section className="shell gutter pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <div>
            <h1 className="h1-page">
              {visit.h1a} <em className="italic">{visit.h1b}</em>
            </h1>

            <div className="mt-10">
              <Eyebrow>Hours</Eyebrow>
              <dl className="rule-top mt-4 max-w-[420px]">
                {settings.hours.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-6 py-3"
                    style={{ borderBottom: "1px solid var(--line)" }}
                  >
                    <dt className="text-[17px]">{row.label}</dt>
                    <dd className="text-[17px] font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-10">
              <Eyebrow>Find us</Eyebrow>
              <address className="not-italic mt-4 text-[17px] leading-[1.8]">
                {business.address.street}
                <br />
                {business.address.city}, {business.address.state} {business.address.zip}
                <br />
                <span style={{ color: "var(--muted)" }}>{business.address.building}</span>
              </address>
              <div className="mt-5 flex flex-wrap items-center gap-6">
                <Button href={business.mapUrl} variant="secondary">
                  Open in Google Maps
                </Button>
                <ArrowLink href={business.mapUrl}>Get directions</ArrowLink>
              </div>
            </div>

            <div className="mt-10">
              <Eyebrow>Say hello</Eyebrow>
              <ul className="mt-4 flex list-none flex-col gap-2 text-[17px]">
                <li>
                  <a href={business.phoneHref} className="link">
                    {business.phone}
                  </a>
                </li>
                <li>
                  <a href={business.emailHref} className="link">
                    {business.email}
                  </a>
                </li>
              </ul>
              <ul className="mt-4 flex list-none flex-wrap gap-x-5 gap-y-2">
                {socialLinks.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${business.shortName} on ${social.label}`}
                      className="link"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <PhotoSlot
            id="visit-exterior"
            className="h-[320px] lg:h-[640px]"
            sizeHint={{ width: 560, height: 640 }}
          />
        </div>
      </section>

      <section id="contact" className="section" style={{ background: "var(--paper)" }}>
        <div className="shell gutter">
          <div className="max-w-[760px]">
            <InquiryForm
              type="contact"
              siteKey={turnstileSiteKey()}
              responseTime={settings.response_time}
              heading="Send us a message"
              intro="Questions about hours, orders or anything else — we’ll get back to you."
            />
          </div>
        </div>
      </section>
    </>
  );
}
