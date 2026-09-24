import Link from "next/link";
import { DirtyForm } from "../DirtyForm";
import { guardPage } from "../Guard";
import { HistoryLinks } from "../HistoryLinks";
import { saveCatering } from "../content-actions";
import { getCatering } from "@/lib/content";
import { packagesToText } from "@/lib/catering-text";
import { guestTiers, packagePrice, tierMultiplier } from "@/content/catering";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminCateringPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const catering = await getCatering();

  return (
    <div className="max-w-[760px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Catering
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        The packages in the estimator on the private events page. One per line: the name,
        the group it sits under, and what it costs for up to 10 guests.
      </p>
      <p className="mt-3 text-[15px]">
        <Link href="/private-events#catering" className="link" target="_blank">
          See the estimator
        </Link>
      </p>

      <div
        className="mt-5 rounded-[2px] p-4"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      >
        <p
          className="text-[13px] font-semibold uppercase"
          style={{ letterSpacing: "0.1em", color: "var(--muted)" }}
        >
          How the price scales
        </p>
        <p className="mt-2 text-[16px]">
          {guestTiers
            .map((tier) => `up to ${tier} guests · ×${tierMultiplier[tier]}`)
            .join("  ·  ")}
        </p>
        {catering.packages[0] ? (
          <p className="mt-1 text-[15px]" style={{ color: "var(--muted)" }}>
            {catering.packages[0].name} at {money(catering.packages[0].base)} works out at{" "}
            {money(packagePrice(catering.packages[0], 40))} for 40.
          </p>
        ) : null}
      </div>

      <DirtyForm action={saveCatering} className="mt-8" saveLabel="Save catering">
        <div>
          <label htmlFor="packages" className="field-label">
            Packages
          </label>
          <textarea
            id="packages"
            name="packages"
            className="field-input"
            rows={Math.max(6, catering.packages.length + 2)}
            defaultValue={packagesToText(catering.packages)}
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 15 }}
          />
          <p className="field-hint">
            Name | Group | price for 10 guests — e.g. Fruit Tray | Trays &amp; sides | 40
          </p>
        </div>

        <div className="mt-6">
          <label htmlFor="addOnNote" className="field-label">
            Add-ons and extras
          </label>
          <textarea
            id="addOnNote"
            name="addOnNote"
            className="field-input"
            rows={3}
            defaultValue={catering.addOnNote}
          />
          <p className="field-hint">Printed under the estimator, as one paragraph.</p>
        </div>

        <div className="mt-6">
          <label htmlFor="goodToKnow" className="field-label">
            Good to know
          </label>
          <textarea
            id="goodToKnow"
            name="goodToKnow"
            className="field-input"
            rows={Math.max(4, catering.goodToKnow.length + 1)}
            defaultValue={catering.goodToKnow.join("\n")}
          />
          <p className="field-hint">
            One rule per line — deposits, clean-up, alcohol, outside caterers.
          </p>
        </div>
      </DirtyForm>

      <HistoryLinks keys={["catering"]} />
    </div>
  );
}
