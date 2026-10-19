import { DirtyForm } from "../DirtyForm";
import { HistoryLinks } from "../HistoryLinks";
import { guardPage } from "../Guard";
import { saveBusinessScreen } from "../content-actions";
import { getBusiness, getOrdering } from "@/lib/content";

export const dynamic = "force-dynamic";

type Row = {
  /** The form field name — `business.*` paths are read back by `parseShape()`. */
  name: string;
  label: string;
  value: string;
  type?: "tel" | "email" | "url";
  hint?: string;
  required?: boolean;
};

function Fields({ title, intro, rows }: { title: string; intro?: string; rows: Row[] }) {
  return (
    <fieldset className="mt-10 border-0 p-0 first:mt-0">
      <legend className="display" style={{ fontSize: 22 }}>
        {title}
      </legend>
      {intro ? (
        <p className="mt-1 text-[15px]" style={{ color: "var(--muted)" }}>
          {intro}
        </p>
      ) : null}
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.name}>
            <label htmlFor={row.name} className="field-label">
              {row.label}
            </label>
            <input
              id={row.name}
              name={row.name}
              type={row.type ?? "text"}
              className="field-input"
              placeholder={row.type === "url" ? "https://" : undefined}
              required={row.required}
              defaultValue={row.value}
            />
            {row.hint ? <p className="field-hint">{row.hint}</p> : null}
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export default async function AdminBusinessPage() {
  const guard = await guardPage("settings.business");
  if (!guard.ok) return guard.screen;

  const [business, ordering] = await Promise.all([getBusiness(), getOrdering()]);

  return (
    <div className="max-w-[760px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Business details
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        How people reach you. These appear in the footer, on the Visit page, in the emails
        the site sends, and in what Google shows about you — so change them here rather
        than page by page.
      </p>

      <DirtyForm action={saveBusinessScreen} className="mt-8" saveLabel="Save details">
        <Fields
          title="Phone & email"
          rows={[
            { name: "business.phone", label: "Phone", value: business.phone, type: "tel", required: true },
            { name: "business.email", label: "Email", value: business.email, type: "email", required: true },
          ]}
        />

        <Fields
          title="Address"
          rows={[
            { name: "business.address.street", label: "Street", value: business.address.street, required: true },
            { name: "business.address.city", label: "City", value: business.address.city, required: true },
            { name: "business.address.state", label: "State", value: business.address.state, required: true },
            { name: "business.address.zip", label: "ZIP code", value: business.address.zip, required: true },
          ]}
        />

        <Fields
          title="Social links"
          intro="Leave one blank and its icon disappears from the site."
          rows={[
            { name: "business.social.instagram", label: "Instagram", value: business.social.instagram, type: "url" },
            { name: "business.social.facebook", label: "Facebook", value: business.social.facebook, type: "url" },
            { name: "business.social.tiktok", label: "TikTok", value: business.social.tiktok, type: "url" },
            { name: "business.social.x", label: "X", value: business.social.x, type: "url" },
          ]}
        />

        <Fields
          title="Order ahead & delivery"
          intro="A button appears on the site for every link you fill in; leave one blank and that button stays hidden."
          rows={[
            {
              name: "orderAhead",
              label: "Order ahead",
              value: ordering.orderAhead,
              type: "url",
              hint: "Your own ordering page, e.g. Square or Toast.",
            },
            { name: "doordash", label: "DoorDash", value: ordering.doordash, type: "url" },
            { name: "ubereats", label: "Uber Eats", value: ordering.ubereats, type: "url" },
          ]}
        />
      </DirtyForm>

      <HistoryLinks keys={["business", "ordering"]} />
    </div>
  );
}
