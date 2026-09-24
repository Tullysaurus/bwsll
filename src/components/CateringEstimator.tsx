"use client";

import { useMemo, useState } from "react";
import { guestTiers, packagePrice, type GuestTier } from "@/content/catering";
import type { Catering } from "@/lib/content";
import { money } from "@/lib/format";
import { useEstimate } from "./EstimateContext";
import { Eyebrow } from "./Typography";

/**
 * §5.3.4 — group-size pills, package checkboxes, live total. No backend.
 *
 * The packages come in as a prop rather than an import: they're owner-editable now, and
 * this is a client component, so the server has to hand them over.
 */
export function CateringEstimator({ catering }: { catering: Catering }) {
  const { packages, addOnNote } = catering;
  const [tier, setTier] = useState<GuestTier>(catering.defaultTier);
  const [selected, setSelected] = useState<string[]>(catering.defaultSelected);
  const shared = useEstimate();

  const chosen = useMemo(
    () => packages.filter((pkg) => selected.includes(pkg.id)),
    [packages, selected],
  );
  const total = useMemo(
    () => chosen.reduce((sum, pkg) => sum + packagePrice(pkg, tier), 0),
    [chosen, tier],
  );

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const attach = () => {
    shared?.attach({
      guests: String(tier) as "10" | "20" | "40",
      items: chosen.map((pkg) => ({ name: pkg.name, price: packagePrice(pkg, tier) })),
      total,
    });
    document.getElementById("inquire")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const summary = `${chosen.length} package${chosen.length === 1 ? "" : "s"} for up to ${tier} guests`;

  return (
    <div className="grid gap-12 lg:grid-cols-[1.55fr_1fr] lg:gap-16">
      <div>
        <Eyebrow>Catering</Eyebrow>
        <h2 className="h2 mt-4">Build an estimate</h2>
        <p className="mt-4 text-[17px]" style={{ color: "var(--muted)" }}>
          Pick your group size, then check the packages you want.
        </p>

        <div
          role="radiogroup"
          aria-label="Group size"
          className="mt-8 flex flex-wrap gap-3"
        >
          {guestTiers.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={tier === value}
              onClick={() => setTier(value)}
              className="chip"
              style={{ height: 46 }}
            >
              Up to {value} guests
            </button>
          ))}
        </div>

        <fieldset className="rule-top-ink mt-8 border-0 p-0">
          <legend className="sr-only">Catering packages</legend>
          {packages.map((pkg) => (
            <label
              key={pkg.id}
              className="grid cursor-pointer items-center gap-4 py-4"
              style={{ gridTemplateColumns: "28px 1fr 90px", borderBottom: "1px solid var(--line)" }}
            >
              <input
                type="checkbox"
                className="checkbox"
                checked={selected.includes(pkg.id)}
                onChange={() => toggle(pkg.id)}
              />
              <span>
                <span className="block text-[17px]">{pkg.name}</span>
                <span className="block text-[13px]" style={{ color: "var(--muted)" }}>
                  {pkg.group}
                </span>
              </span>
              <span className="tnum text-right font-medium">{money(packagePrice(pkg, tier))}</span>
            </label>
          ))}
        </fieldset>

        <p className="mt-5 text-[14px]" style={{ color: "var(--muted)" }}>
          {addOnNote}
        </p>
      </div>

      {/* Desktop estimate card. */}
      <aside className="on-dark hidden self-start lg:block" style={{ background: "var(--ink)", padding: 40 }}>
        <Eyebrow gold>Your estimate</Eyebrow>
        <p
          className="display mt-4"
          style={{ fontSize: 76, lineHeight: 1, color: "var(--paper)" }}
          aria-live="polite"
        >
          {money(total)}
        </p>
        <p className="mt-4 text-[16px]" style={{ color: "var(--footer-text)" }}>
          {summary}
        </p>
        <hr className="my-5" style={{ border: 0, borderTop: "1px solid var(--footer-rule)" }} />
        <p className="text-[14px]" style={{ color: "var(--footer-muted)" }}>
          Estimates cover food and beverage only. Space rental, staffing and delivery are confirmed by email.
        </p>
        <button type="button" onClick={attach} className="btn btn-gold mt-6 w-full">
          Send this with my request
        </button>
      </aside>

      {/* Mobile: sticky bar with the running total. */}
      <div
        className="on-dark fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 lg:hidden"
        style={{ background: "var(--ink)", padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.16em", color: "var(--gold)" }}>
            Your estimate
          </p>
          <p className="display" style={{ fontSize: 26, color: "var(--paper)", lineHeight: 1.1 }} aria-live="polite">
            {money(total)}
          </p>
        </div>
        <button type="button" onClick={attach} className="btn btn-gold">
          Add to request
        </button>
      </div>
    </div>
  );
}
