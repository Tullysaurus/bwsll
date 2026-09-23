import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";
import { PhotoSlot } from "@/components/PhotoSlot";
import { PageIntro } from "@/components/Typography";
import { files } from "@/content/business";
import { getCopy } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "Workforce & business development",
  description:
    "On-the-job training in employability skills — from the espresso bar to inventory, marketing and AI-powered operations.",
  alternates: { canonical: "/workforce" },
};

export default async function WorkforcePage() {
  const [settings, copy] = await Promise.all([getSettings(), getCopy()]);
  const { businessDevelopment, home, workforceCurriculum } = copy;

  return (
    <>
      <PageIntro
        eyebrow={home.workforce.eyebrow}
        titleStart="Learning the business,"
        titleItalic="one shift at a time."
        intro={home.workforce.body}
        aside={
          <PhotoSlot
            id="workforce"
            className="h-[240px] w-full lg:h-[320px] lg:w-[420px]"
            sizeHint={{ width: 560, height: 420 }}
          />
        }
      />

      <section className="shell gutter pb-16 md:pb-24">
        <h2 className="h2">What trainees learn</h2>
        <ul className="rule-top-ink mt-8 list-none">
          {workforceCurriculum.map((row) => (
            <li
              key={row.n}
              className="grid gap-2 py-6 lg:grid-cols-[60px_1fr_1.2fr] lg:gap-8"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              <span className="display" style={{ fontSize: 18, color: "var(--green)" }}>
                {row.n}
              </span>
              <h3 className="text-[17px] font-medium">{row.label}</h3>
              <p className="text-[16px]" style={{ color: "var(--muted)" }}>
                {row.detail}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <a href={files.traineeMou} className="link">
            Trainee MOU (PDF)
          </a>
        </p>
      </section>

      <section id="business-development" className="section" style={{ background: "var(--paper)" }}>
        <div className="shell gutter">
          <div className="max-w-[760px]">
            <h2 className="h2">Business development with BWS Enterprises</h2>
            <p className="mt-5 body-lg" style={{ color: "var(--muted)" }}>
              {businessDevelopment}
            </p>
          </div>
        </div>
      </section>

      <section id="apply" className="shell gutter section">
        <div className="max-w-[760px]">
          <InquiryForm
            type="workforce"
            siteKey={turnstileSiteKey()}
            responseTime={settings.response_time}
            heading="Apply"
            intro="Tell us a little about yourself and which program you’re interested in."
          />
        </div>
      </section>
    </>
  );
}
