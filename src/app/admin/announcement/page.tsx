import { saveAnnouncement } from "../actions";
import { DirtyForm } from "../DirtyForm";
import { HistoryLinks } from "../HistoryLinks";
import { guardPage } from "../Guard";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const settings = await getSettings();
  const closed = Boolean(settings.closure_notice.trim());

  return (
    <div className="max-w-[720px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Top bar message
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        The strip across the very top of every page on the website. Everyone who visits
        sees it, so keep it short.
      </p>

      <div
        className="mt-5 rounded-[2px] p-4"
        style={{
          background: closed ? "var(--green)" : "var(--paper)",
          color: closed ? "var(--paper)" : "var(--ink)",
          border: "1px solid var(--line)",
        }}
      >
        <p className="text-[13px] font-semibold uppercase" style={{ letterSpacing: "0.1em" }}>
          Showing right now
        </p>
        <p className="mt-2 text-[17px]">
          {settings.closure_notice.trim() || settings.announcement.trim() || "Nothing — the bar is empty."}
        </p>
        {closed ? (
          <p className="mt-2 text-[14px]">
            A closed notice is up. Clear the closed notice below to go back to your normal
            message.
          </p>
        ) : null}
      </div>

      <DirtyForm action={saveAnnouncement} className="mt-8" saveLabel="Save message">
        <div className="grid gap-5">
          <div>
            <label htmlFor="closure_notice" className="field-label">
              Closed today? Say so here
            </label>
            <input
              id="closure_notice"
              name="closure_notice"
              className="field-input"
              defaultValue={settings.closure_notice}
              placeholder="Closed today for a private event"
            />
            <p className="field-hint">
              While this has anything in it, it replaces the normal message and turns the
              bar green. Empty it when you reopen.
            </p>
          </div>

          <div>
            <label htmlFor="announcement" className="field-label">
              Normal message
            </label>
            <input
              id="announcement"
              name="announcement"
              className="field-input"
              defaultValue={settings.announcement}
              placeholder="Now open at GEM · 609 E. Pine St., Tulsa"
            />
          </div>

          <div>
            <label htmlFor="announcement_short" className="field-label">
              Shorter version, for phones
            </label>
            <input
              id="announcement_short"
              name="announcement_short"
              className="field-input"
              defaultValue={settings.announcement_short}
              placeholder="Now open at GEM"
            />
            <p className="field-hint">A few words — phone screens cut off anything longer.</p>
          </div>
        </div>

        <HistoryLinks keys={["announcement", "announcement_short", "closure_notice"]} />
      </DirtyForm>
    </div>
  );
}
