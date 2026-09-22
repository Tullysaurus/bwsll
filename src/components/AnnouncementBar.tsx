import { getSettings } from "@/lib/settings";

/** §4.1 — a closure notice replaces the announcement and turns the bar green. */
export async function AnnouncementBar() {
  const settings = await getSettings();
  const closure = settings.closure_notice.trim();
  const left = closure || settings.announcement;
  const leftShort = closure || settings.announcement_short;

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
          {settings.hours_short}
        </p>

        {/* Mobile: one centred line. */}
        <p className="w-full text-center md:hidden" style={{ fontWeight: 500 }}>
          {leftShort} · {settings.hours_short.replace(" · ", " ")}
        </p>
      </div>
    </div>
  );
}
