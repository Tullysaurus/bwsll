import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";
import { PageIntro } from "@/components/Typography";
import { files } from "@/content/business";
import { getCopy } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "Vendor program",
  description:
    "Sell pastries, snacks, packaged goods or apparel at Black Wall Street Liquid Lounge in Tulsa's Greenwood District.",
  alternates: { canonical: "/vendors" },
};

export default async function VendorsPage() {
  const [settings, { vendors }] = await Promise.all([getSettings(), getCopy()]);

  return (
    <>
      <PageIntro
        eyebrow={vendors.eyebrow}
        titleStart={vendors.h1a}
        titleItalic={vendors.h1b}
        intro={vendors.intro}
      />

      <section className="shell gutter pb-16 md:pb-24">
        <h2 className="h2">What we need from you</h2>
        <ul className="rule-top-ink mt-8 max-w-[760px] list-none">
          {vendors.requirements.map((item) => (
            <li key={item} className="py-4 text-[17px]" style={{ borderBottom: "1px solid var(--line)" }}>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[720px] text-[16px]" style={{ color: "var(--muted)" }}>
          {vendors.note}
        </p>
        <p className="mt-4">
          <a href={files.vendorAgreement} className="link">
            Vendor agreement (PDF)
          </a>
        </p>
      </section>

      <section id="apply" className="section" style={{ background: "var(--paper)" }}>
        <div className="shell gutter">
          <div className="max-w-[760px]">
            <InquiryForm
              type="vendor"
              siteKey={turnstileSiteKey()}
              responseTime={settings.response_time}
              heading="Apply to sell with us"
              intro="Tell us about your business and what you’d like us to carry."
            />
          </div>
        </div>
      </section>
    </>
  );
}
