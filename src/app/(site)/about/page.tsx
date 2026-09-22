import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { PhotoSlot } from "@/components/PhotoSlot";
import { PageIntro } from "@/components/Typography";
import { about } from "@/content/copy";

export const metadata: Metadata = {
  title: "Our story",
  description:
    "Black Wall Street Liquid Lounge began on Greenwood Avenue and reopened inside the Greenwood Entrepreneurship at Moton.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageIntro eyebrow={about.eyebrow} titleStart={about.h1a} titleItalic={about.h1b} />

      <section className="shell gutter pb-16 md:pb-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div className="max-w-[620px]">
            {about.body.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="mb-6 body-lg">
                {paragraph}
              </p>
            ))}
            <div className="mt-4 flex flex-wrap gap-4">
              <Button href="/visit">Plan your visit</Button>
              <Button href="/menu" variant="secondary">
                See the menu
              </Button>
            </div>
          </div>
          <div className="grid gap-6">
            <PhotoSlot id="about-1" className="h-[260px] lg:h-[420px]" sizeHint={{ width: 560, height: 420 }} />
            <PhotoSlot id="about-2" className="h-[260px] lg:h-[420px]" sizeHint={{ width: 560, height: 420 }} />
          </div>
        </div>
      </section>
    </>
  );
}
