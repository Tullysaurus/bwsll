import { getClosures, todayLocal } from "@/lib/closures";
import { getHours } from "@/lib/content";
import { closureBanner, shortLabel } from "@/lib/hours";
import { getSettings } from "@/lib/settings";

/**
 * §4.1 — a closure replaces the announcement and turns the bar green. The notice is
 * either typed by hand on the Top bar message screen or generated from a dated closure
 * within the next week, whichever is set; the typed one wins.
 */
export async function AnnouncementBar() {
  const [settings, hours, closures] = await Promise.all([getSettings(), getHours(), getClosures()]);

  const closure = settings.closure_notice.trim() || closureBanner(closures, todayLocal());
  const left = closure || settings.announcement;
  const leftShort = closure || settings.announcement_short;
  const hoursShort = shortLabel(hours);

  return (
    <div
      className="on-dark w-full"
      style={{ background: closure ? "var(--green)" : "var(--ink)", color: "var(--cream)" }}
    >
      <div
        className="shell gutter flex items-center justify-between gap-4"
        style={{ paddingBlock: 11, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}
      >
        {/* Desktop: announcement left, hours right. */}
        <p className="hidden md:block" style={{ fontWeight: 500 }}>
          {left}
        </p>
        <p className="hidden md:block" style={{ color: "var(--footer-text)" }}>
          {hoursShort}
        </p>

        {/* Mobile: one centred line. */}
        <p className="w-full text-center md:hidden" style={{ fontWeight: 500 }}>
          {leftShort} · {hoursShort.replace(" · ", " ")}
        </p>
      </div>
    </div>
  );
}
