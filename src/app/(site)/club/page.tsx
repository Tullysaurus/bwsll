import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";
import { PhotoSlot } from "@/components/PhotoSlot";
import { PageIntro } from "@/components/Typography";
import { files } from "@/content/business";
import { getCopy } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "Liquid Love Club",
  description:
    "$250 a year for the regulars: monthly coffee, 10% off, a complimentary private event and monthly conference room time.",
  alternates: { canonical: "/club" },
};

export default async function ClubPage() {
  const [settings, { club }] = await Promise.all([getSettings(), getCopy()]);

  return (
    <>
      <PageIntro
        eyebrow={club.eyebrow}
        titleStart={club.h1a}
        titleItalic={club.h1b}
        intro={club.intro}
        aside={
          <PhotoSlot
            id="club"
            className="h-[240px] w-full lg:h-[320px] lg:w-[420px]"
            sizeHint={{ width: 560, height: 420 }}
          />
        }
      />

      <section className="shell gutter pb-16 md:pb-24">
        <h2 className="sr-only">Member benefits</h2>
        <ul className="rule-top-ink list-none">
          {club.benefits.map((benefit) => (
            <li
              key={benefit.title}
              className="grid gap-2 py-7 lg:grid-cols-[1.2fr_1fr] lg:gap-16"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              <h3 className="display" style={{ fontSize: 28, lineHeight: 1.2 }}>
                {benefit.title}
              </h3>
              <p className="text-[16px]" style={{ color: "var(--muted)" }}>
                {benefit.body}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-6 max-w-[720px] text-[14px]" style={{ color: "var(--muted)" }}>
          {club.fine}
        </p>
        <p className="mt-4">
          <a href={files.memberAgreement} className="link">
            Member agreement (PDF)
          </a>
        </p>
      </section>

      <section id="join" className="section" style={{ background: "var(--paper)" }}>
        <div className="shell gutter">
          <div className="max-w-[760px]">
            <InquiryForm
              type="club"
              siteKey={turnstileSiteKey()}
              responseTime={settings.response_time}
              heading="Join the club"
              intro="Send us your details and we’ll follow up with payment and your start date."
            />
          </div>
        </div>
      </section>
    </>
  );
}
