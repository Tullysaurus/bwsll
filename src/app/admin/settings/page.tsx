import { saveSettings } from "../actions";
import { rentalRows, rentalTiers } from "@/content/catering";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const HOUR_ROWS = 4;

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  const hours = [...settings.hours];
  while (hours.length < HOUR_ROWS) hours.push({ label: "", value: "" });

  return (
    <div className="max-w-[720px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Settings
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--muted)" }}>
        These values appear in the top bar, the footer and on the private events page.
      </p>

      <form action={saveSettings} className="mt-8">
        <fieldset className="border-0 p-0">
          <legend className="display" style={{ fontSize: 22 }}>
            Top bar
          </legend>

          <div className="mt-4 grid gap-5">
            <div>
              <label htmlFor="announcement" className="field-label">
                Announcement
              </label>
              <input
                id="announcement"
                name="announcement"
                className="field-input"
                defaultValue={settings.announcement}
              />
            </div>

            <div>
              <label htmlFor="announcement_short" className="field-label">
                Announcement (short, for phones)
              </label>
              <input
                id="announcement_short"
                name="announcement_short"
                className="field-input"
                defaultValue={settings.announcement_short}
              />
            </div>

            <div>
              <label htmlFor="closure_notice" className="field-label">
                Closure notice (optional)
              </label>
              <input
                id="closure_notice"
                name="closure_notice"
                className="field-input"
                defaultValue={settings.closure_notice}
              />
              <p className="field-hint">
                Shows in the top bar in green — clear it when you reopen.
              </p>
            </div>

            <div>
              <label htmlFor="hours_short" className="field-label">
                Short hours line
              </label>
              <input
                id="hours_short"
                name="hours_short"
                className="field-input"
                defaultValue={settings.hours_short}
              />
              <p className="field-hint">Example: Mon–Sat · 7am–4pm</p>
            </div>
          </div>
        </fieldset>

        <fieldset className="mt-10 border-0 p-0">
          <legend className="display" style={{ fontSize: 22 }}>
            Hours
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
        </fieldset>

        <fieldset className="mt-10 border-0 p-0">
          <legend className="display" style={{ fontSize: 22 }}>
            Space rental rates
          </legend>
          <p className="mt-1 text-[14px]" style={{ color: "var(--muted)" }}>
            Free text, e.g. &ldquo;$75&rdquo;. Blank rates show as &ldquo;Ask us&rdquo; on the site.
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
              Response time promise
            </label>
            <input
              id="response_time"
              name="response_time"
              className="field-input"
              defaultValue={settings.response_time}
            />
            <p className="field-hint">
              Shown after someone submits a form: &ldquo;We&rsquo;ll reply by email within …&rdquo;
            </p>
          </div>
        </fieldset>

        <button type="submit" className="btn btn-primary mt-8">
          Save settings
        </button>
      </form>
    </div>
  );
}
