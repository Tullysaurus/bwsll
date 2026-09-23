import { PageIntro } from "./Typography";
import type { LegalSection } from "@/content/legal";

export function LegalPage({
  eyebrow,
  titleStart,
  titleItalic,
  sections,
  lastUpdated,
}: {
  eyebrow: string;
  titleStart: string;
  titleItalic: string;
  sections: LegalSection[];
  lastUpdated: string;
}) {
  return (
    <>
      <PageIntro
        eyebrow={eyebrow}
        titleStart={titleStart}
        titleItalic={titleItalic}
        intro={`Last updated ${lastUpdated}.`}
      />
      <section className="shell gutter pb-16 md:pb-24">
        <div className="max-w-[720px]">
          {sections.map((section) => (
            <div key={section.heading} className="mb-10">
              <h2 className="h3">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 32)} className="mt-4 text-[17px]" style={{ color: "var(--muted)" }}>
                  {paragraph}
                </p>
              ))}
              {section.list ? (
                <ul className="mt-4 list-disc pl-5 text-[17px]" style={{ color: "var(--muted)" }}>
                  {section.list.map((item) => (
                    <li key={item.slice(0, 32)} className="mb-2">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
