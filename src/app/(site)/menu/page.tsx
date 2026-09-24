import type { Metadata } from "next";
import { OrderButtons } from "@/components/OrderButtons";
import { TrackedLink } from "@/components/TrackedLink";
import { MenuTable, SimpleTable } from "@/components/MenuTable";
import { PhotoSlot } from "@/components/PhotoSlot";
import { SignatureGrid } from "@/components/SignatureGrid";
import { Eyebrow, PageIntro } from "@/components/Typography";
import { files } from "@/content/business";
import { getCopy, getMenu } from "@/lib/content";


export const metadata: Metadata = {
  title: "Menu",
  description:
    "Roots Java coffee, espresso, teas, blends and tonics — plus house signatures named for the people who built Greenwood.",
  alternates: { canonical: "/menu" },
};

export default async function MenuPage() {
  const [{ menuPage }, menu] = await Promise.all([getCopy(), getMenu()]);
  const { espresso, flavorShots, food, signatureGroups, sizedTables } = menu;
  const menuSections = menu.sections;
  return (
    <>
      <PageIntro
        eyebrow={menuPage.eyebrow}
        titleStart={menuPage.h1a}
        titleItalic={menuPage.h1b}
        intro={menuPage.intro}
        large
        aside={
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <TrackedLink href={files.menu} event="menu_pdf" className="btn btn-secondary">
              Download PDF menu
            </TrackedLink>
            <OrderButtons className="lg:justify-end" />
            <p className="caption" style={{ color: "var(--muted)" }}>
              {menuPage.caption}
            </p>
          </div>
        }
      />

      {/* Section chips */}
      <nav aria-label="Menu sections" className="shell gutter sticky top-[91px] z-30 pb-6" style={{ background: "var(--cream)" }}>
        <ul className="no-scrollbar -mx-1 flex list-none gap-3 overflow-x-auto px-1 pb-1">
          {menuSections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="chip">
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Coffee & tea */}
      <section id="coffee" className="shell gutter pb-16 pt-6 md:pb-24">
        <h2 className="sr-only">Coffee &amp; tea</h2>
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          {sizedTables.map((table) => (
            <MenuTable key={table.id} table={table} />
          ))}
        </div>
      </section>

      {/* House signatures */}
      <section
        id="signatures"
        className="on-dark"
        style={{ background: "var(--green)", color: "var(--paper)", paddingBlock: 100 }}
      >
        <div className="shell gutter">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
            <div>
              <Eyebrow gold>House signatures</Eyebrow>
              <h2 className="h2 mt-4" style={{ color: "var(--paper)" }}>
                Named for Greenwood.
              </h2>
            </div>
            <p className="max-w-[420px] text-[17px] lg:text-right" style={{ color: "var(--green-soft-text)" }}>
              Ask your barista about the person behind each name.
            </p>
          </div>
          <div className="mt-12">
            <SignatureGrid groups={signatureGroups} />
          </div>
        </div>
      </section>

      {/* Espresso · Food · Flavor shots */}
      <section className="shell gutter section">
        <h2 className="sr-only">Espresso, food and flavor shots</h2>
        <div className="grid gap-14 lg:grid-cols-3 lg:gap-16">
          <div>
            <SimpleTable id="espresso" title="Espresso" items={espresso} />
          </div>

          <div>
            <SimpleTable id="food" title="Food" items={food} />
            <PhotoSlot id="menu-food" className="mt-8 h-[170px]" sizeHint={{ width: 357, height: 170 }} />
          </div>

          <div id="flavors">
            <h3 className="display pb-3" style={{ fontSize: 36, borderBottom: "1px solid var(--ink)" }}>
              Flavor shots
            </h3>
            <p className="mt-5 text-[17px]">{flavorShots.price}</p>
            {flavorShots.groups.map((group) => (
              <div key={group.label} className="mt-6">
                <Eyebrow>{group.label}</Eyebrow>
                <p className="mt-2 text-[17px]" style={{ color: "var(--muted)" }}>
                  {group.items}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
