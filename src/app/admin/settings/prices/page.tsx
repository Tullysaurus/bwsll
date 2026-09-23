import Link from "next/link";
import { saveSettings } from "../../actions";
import { DirtyForm } from "../../DirtyForm";
import { HistoryLinks } from "../../HistoryLinks";
import { guardPage } from "../../Guard";
import { rentalRows, rentalTiers } from "@/content/catering";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const settings = await getSettings();

  return (
    <div className="max-w-[720px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Prices &amp; replies
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        Room rental prices and the reply time you promise. These show on the private
        events page and after someone sends a form.
      </p>
      <p className="mt-3 text-[15px]">
        <Link href="/admin/settings" className="link">
          ← Back to settings
        </Link>
      </p>

      <DirtyForm action={saveSettings} className="mt-8" saveLabel="Save prices">
        <fieldset className="mt-10 border-0 p-0">
          <legend className="display" style={{ fontSize: 22 }}>
            Room rental prices
          </legend>
          <p className="mt-1 text-[14px]" style={{ color: "var(--muted)" }}>
            Free text, e.g. &ldquo;$75&rdquo;. Blank prices show as &ldquo;Ask us&rdquo; on the site.
          </p>
          {rentalRows.map((row) => (
            <div key={row.id} className="mt-5">
              <p className="text-[16px] font-medium">
                {row.title} <span style={{ color: "var(--muted)" }}>({row.sub})</span>
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {rentalTiers.map((tier) => (
                  <div key={tier.id}>
                    <label htmlFor={`rate_${row.id}_${tier.id}`} className="field-label">
                      {tier.label}
                    </label>
                    <input
                      id={`rate_${row.id}_${tier.id}`}
                      name={`rate_${row.id}_${tier.id}`}
                      className="field-input"
                      defaultValue={settings.rental_rates[row.id][tier.id]}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        <fieldset className="mt-10 border-0 p-0">
          <legend className="display" style={{ fontSize: 22 }}>
            Replies
          </legend>
          <div className="mt-4">
            <label htmlFor="response_time" className="field-label">
              How soon you promise to reply
            </label>
            <input
              id="response_time"
              name="response_time"
              className="field-input"
              defaultValue={settings.response_time}
            />
            <p className="field-hint">
              Shown after someone sends a form: &ldquo;We&rsquo;ll reply by email within …&rdquo;
            </p>
          </div>
        </fieldset>

        <HistoryLinks keys={["rental_rates", "response_time"]} />
      </DirtyForm>
    </div>
  );
}
