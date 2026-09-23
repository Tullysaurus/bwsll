import { DirtyForm } from "../DirtyForm";
import { HistoryLinks } from "../HistoryLinks";
import { ConfirmButton } from "../ConfirmButton";
import { guardPage } from "../Guard";
import { deleteClosure, saveClosure, saveHours } from "../content-actions";
import { listAllClosures, todayLocal } from "@/lib/closures";
import { getHours } from "@/lib/content";
import { closureDates, DAY_KEYS, DAY_NAME, isClosed, shortLabel, timeLabel, weeklyLabels } from "@/lib/hours";

export const dynamic = "force-dynamic";

export default async function AdminHoursPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const [hours, closures] = await Promise.all([getHours(), listAllClosures()]);
  const today = todayLocal();

  return (
    <div className="max-w-[760px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Hours &amp; closed days
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        Your normal week, plus any one-off days you&rsquo;re closed or open at different
        times. The website works out how to word it.
      </p>

      <div
        className="mt-5 rounded-[2px] p-4"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      >
        <p
          className="text-[13px] font-semibold uppercase"
          style={{ letterSpacing: "0.1em", color: "var(--muted)" }}
        >
          How this reads on the site
        </p>
        <p className="mt-2 text-[17px]">{shortLabel(hours)}</p>
        <ul className="mt-1 text-[15px]" style={{ color: "var(--muted)" }}>
          {weeklyLabels(hours).map((row) => (
            <li key={row.label}>
              {row.label} · {row.value}
            </li>
          ))}
        </ul>
      </div>

      <DirtyForm action={saveHours} className="mt-8" saveLabel="Save hours">
        <fieldset className="border-0 p-0">
          <legend className="display" style={{ fontSize: 22 }}>
            A normal week
          </legend>
          <div className="mt-4 grid gap-3">
            {DAY_KEYS.map((day) => {
              const value = hours[day];
              const shut = isClosed(value);
              return (
                <div key={day} className="grid items-end gap-3 sm:grid-cols-[130px_1fr_1fr_auto]">
                  <p className="text-[16px] font-medium">{DAY_NAME[day]}</p>
                  <div>
                    <label htmlFor={`${day}_open`} className="field-label">
                      Opens
                    </label>
                    <input
                      id={`${day}_open`}
                      name={`${day}_open`}
                      type="time"
                      className="field-input"
                      defaultValue={shut ? "" : value.open}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${day}_close`} className="field-label">
                      Closes
                    </label>
                    <input
                      id={`${day}_close`}
                      name={`${day}_close`}
                      type="time"
                      className="field-input"
                      defaultValue={shut ? "" : value.close}
                    />
                  </div>
                  <label className="flex min-h-[50px] items-center gap-2 text-[15px]">
                    <input
                      type="checkbox"
                      name={`${day}_closed`}
                      className="checkbox"
                      defaultChecked={shut}
                    />
                    Closed
                  </label>
                </div>
              );
            })}
          </div>
        </fieldset>
      </DirtyForm>

      <HistoryLinks keys={["hours_week"]} />

      <hr className="mt-12" style={{ border: 0, borderTop: "1px solid var(--line)" }} />

      <h2 className="display mt-10" style={{ fontSize: 26 }}>
        Closed days &amp; special hours
      </h2>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        A holiday, a private booking, an early close. Anything happening today, or within
        the next week, also shows in the green bar at the top of the site.
      </p>

      {closures.length ? (
        <ul className="mt-5 grid gap-3">
          {closures.map((closure) => {
            const past = closure.end_date < today;
            return (
              <li
                key={closure.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] p-4"
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                  opacity: past ? 0.6 : 1,
                }}
              >
                <div>
                  <p className="text-[17px] font-medium">
                    {closure.closed
                      ? `Closed ${closureDates(closure)}`
                      : `${closureDates(closure)} · ${timeLabel(closure.open_time ?? "")}–${timeLabel(
                          closure.close_time ?? "",
                        )}`}
                  </p>
                  <p className="text-[15px]" style={{ color: "var(--muted)" }}>
                    {closure.note || (past ? "Finished" : "No reason given")}
                  </p>
                </div>
                <form action={deleteClosure}>
                  <input type="hidden" name="id" value={closure.id} />
                  <ConfirmButton
                    className="link"
                    confirm="Remove this from the calendar?"
                    style={{ fontSize: 14 }}
                  >
                    Remove
                  </ConfirmButton>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 text-[16px]" style={{ color: "var(--muted)" }}>
          Nothing on the calendar.
        </p>
      )}

      <form action={saveClosure} className="mt-8">
        <fieldset className="border-0 p-0">
          <legend className="display" style={{ fontSize: 22 }}>
            Add a day
          </legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start_date" className="field-label">
                Date
              </label>
              <input id="start_date" name="start_date" type="date" className="field-input" required />
            </div>
            <div>
              <label htmlFor="end_date" className="field-label">
                Last day (only if it runs on)
              </label>
              <input id="end_date" name="end_date" type="date" className="field-input" />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-3 text-[16px]">
            <input type="checkbox" name="closed" className="checkbox" defaultChecked />
            Closed all day
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="open_time" className="field-label">
                Or opens at
              </label>
              <input id="open_time" name="open_time" type="time" className="field-input" />
            </div>
            <div>
              <label htmlFor="close_time" className="field-label">
                and closes at
              </label>
              <input id="close_time" name="close_time" type="time" className="field-input" />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="note" className="field-label">
              Reason (shown on the site)
            </label>
            <input id="note" name="note" className="field-input" placeholder="Closed for Juneteenth" />
          </div>

          <button type="submit" className="btn btn-primary mt-5">
            Add to the calendar
          </button>
        </fieldset>
      </form>
    </div>
  );
}
