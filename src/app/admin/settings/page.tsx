import Link from "next/link";
import { saveSettings } from "../actions";
import { DirtyForm } from "../DirtyForm";
import { guardPage } from "../Guard";
import { rentalRows, rentalTiers } from "@/content/catering";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const HOUR_ROWS = 4;

export default async function AdminSettingsPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const settings = await getSettings();
  const hours = [...settings.hours];
  while (hours.length < HOUR_ROWS) hours.push({ label: "", value: "" });

  return (
    <div className="max-w-[720px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Hours &amp; details
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        Your opening hours, room rental prices and reply time. These show in the footer of
        every page and on the private events page.
      </p>
      <p className="mt-3 text-[15px]">
        Looking for the message at the top of the site?{" "}
        <Link href="/admin/announcement" className="link">
          That&rsquo;s on the Top bar message page.
        </Link>
      </p>

      <DirtyForm action={saveSettings} className="mt-8" saveLabel="Save details">
        <fieldset className="border-0 p-0">
          <legend className="display" style={{ fontSize: 22 }}>
            Opening hours
          </legend>
          <p className="mt-1 text-[14px]" style={{ color: "var(--muted)" }}>
            Leave a row blank to remove it.
          </p>
          <div className="mt-4 grid gap-4">
            {hours.slice(0, HOUR_ROWS).map((row, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`hours_label_${i}`} className="field-label">
                    Days
                  </label>
                  <input
                    id={`hours_label_${i}`}
                    name={`hours_label_${i}`}
                    className="field-input"
                    defaultValue={row.label}
                    placeholder="Monday–Saturday"
                  />
                </div>
                <div>
                  <label htmlFor={`hours_value_${i}`} className="field-label">
                    Hours
                  </label>
                  <input
                    id={`hours_value_${i}`}
                    name={`hours_value_${i}`}
                    className="field-input"
                    defaultValue={row.value}
                    placeholder="7am–4pm"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <label htmlFor="hours_short" className="field-label">
              One-line version, for the top of the site
            </label>
            <input
              id="hours_short"
              name="hours_short"
              className="field-input"
              defaultValue={settings.hours_short}
            />
            <p className="field-hint">Example: Mon–Sat · 7am–4pm</p>
          </div>
        </fieldset>

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

        <p className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
          <span style={{ color: "var(--muted)" }}>Past versions:</span>
          {["hours", "rental_rates", "response_time"].map((key) => (
            <Link key={key} href={`/admin/history/setting/${key}`} className="link" style={{ fontSize: 14 }}>
              {key.replace(/_/g, " ")}
            </Link>
          ))}
        </p>
      </DirtyForm>
    </div>
  );
}
