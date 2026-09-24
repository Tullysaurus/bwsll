import { DirtyForm } from "../DirtyForm";
import { HistoryLinks } from "../HistoryLinks";
import { guardPage } from "../Guard";
import { ShapeFields } from "../ShapeFields";
import { saveBusinessScreen } from "../content-actions";
import { getBusiness, getOrdering } from "@/lib/content";
import { groupsOf } from "@/lib/shape-form";

export const dynamic = "force-dynamic";

/** Derived from the fields above them, so they're shown rather than edited. */
const DERIVED = new Set(["business.phoneHref", "business.emailHref", "business.addressLine"]);

export default async function AdminBusinessPage() {
  const guard = await guardPage("settings.business");
  if (!guard.ok) return guard.screen;

  const [business, ordering] = await Promise.all([getBusiness(), getOrdering()]);
  const groups = groupsOf({ business } as unknown as Record<string, unknown>).map((group) => ({
    ...group,
    title: "Details",
    fields: group.fields.filter((field) => !DERIVED.has(field.path)),
  }));

  return (
    <div className="max-w-[760px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Business details
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        Your name, address, phone and social links. These appear in the footer, on the
        Visit page, in the emails the site sends, and in what Google shows about you — so
        change them here rather than page by page. The phone link, email link and the
        one-line address are worked out from what you type.
      </p>

      <DirtyForm action={saveBusinessScreen} className="mt-8" saveLabel="Save details">
        <ShapeFields groups={groups} />
        <hr className="mt-12" style={{ border: 0, borderTop: "1px solid var(--line)" }} />

        <h2 className="display mt-10" style={{ fontSize: 26 }}>
          Order ahead &amp; delivery
        </h2>
        <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
          Paste the web address of each one. A button appears on the site for every link
          you fill in; leave one blank and that button stays hidden.
        </p>

        <div className="mt-6 grid gap-5">
          {[
            { name: "orderAhead", label: "Order ahead", hint: "Your own ordering page, e.g. Square or Toast." },
            { name: "doordash", label: "DoorDash", hint: "" },
            { name: "ubereats", label: "Uber Eats", hint: "" },
          ].map((row) => (
            <div key={row.name}>
              <label htmlFor={row.name} className="field-label">
                {row.label}
              </label>
              <input
                id={row.name}
                name={row.name}
                type="url"
                className="field-input"
                placeholder="https://"
                defaultValue={ordering[row.name as keyof typeof ordering]}
              />
              {row.hint ? <p className="field-hint">{row.hint}</p> : null}
            </div>
          ))}
        </div>
      </DirtyForm>

      <HistoryLinks keys={["business", "ordering"]} />
    </div>
  );
}
