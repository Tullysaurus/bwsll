import { getBusiness, getHours } from "@/lib/content";
import { weeklyLabels } from "@/lib/hours";
import { ClockIcon, PhoneIcon, PinIcon } from "./Icons";

type Column = {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueHref?: string;
  sub: React.ReactNode;
};

/** §5.1.3 — three equal columns on desktop, stacked label/value rows on mobile. */
export async function InfoStrip() {
  const [business, hours] = await Promise.all([getBusiness(), getHours()]);
  const rows = weeklyLabels(hours);
  const primaryHours = rows[0];
  const secondaryHours = rows[1];

  const abbreviate = (label: string) =>
    label.replace("Monday", "Mon").replace("Saturday", "Sat").replace("Sunday", "Sun");
  const secondLine = secondaryHours
    ? secondaryHours.value.toLowerCase() === "closed"
      ? `Closed ${secondaryHours.label}`
      : `${secondaryHours.label} ${secondaryHours.value}`
    : "";

  const columns: Column[] = [
    {
      icon: <ClockIcon />,
      label: "Hours",
      value: primaryHours ? `${abbreviate(primaryHours.label)}, ${primaryHours.value}` : "",
      sub: secondLine,
    },
    {
      icon: <PinIcon />,
      label: "Find us",
      value: `${business.address.street}, ${business.address.city}`,
      sub: (
        <a href={business.mapUrl} target="_blank" rel="noreferrer" className="link">
          Get directions
        </a>
      ),
    },
    {
      icon: <PhoneIcon />,
      label: "Call or email",
      value: business.phone,
      valueHref: business.phoneHref,
      sub: (
        <a href={business.emailHref} className="link">
          {business.email}
        </a>
      ),
    },
  ];

  return (
    <section
      aria-label="Hours, location and contact"
      style={{ background: "var(--paper)", borderBottom: "1px solid var(--line)" }}
    >
      {/* Mobile: stacked rows, label left / value right. */}
      <div className="gutter md:hidden">
        {columns.map((col, i) => (
          <div
            key={col.label}
            className="flex items-start justify-between gap-4 py-4"
            style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}
          >
            <p className="eyebrow pt-1" style={{ color: "var(--muted)" }}>
              {col.label}
            </p>
            <div className="text-right">
              <p className="display" style={{ fontSize: 20 }}>
                {col.valueHref ? (
                  <a href={col.valueHref} style={{ color: "inherit" }}>
                    {col.value}
                  </a>
                ) : (
                  col.value
                )}
              </p>
              <div className="mt-1 text-[14px]" style={{ color: "var(--muted)" }}>
                {col.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: three columns divided by hairlines. */}
      <div className="shell hidden md:grid md:grid-cols-3">
        {columns.map((col, i) => (
          <div
            key={col.label}
            className="flex gap-4"
            style={{
              padding: 36,
              paddingLeft: i === 0 ? "var(--gutter)" : 36,
              paddingRight: i === 2 ? "var(--gutter)" : 36,
              borderLeft: i === 0 ? "none" : "1px solid var(--line)",
            }}
          >
            <span className="shrink-0 pt-1" style={{ color: "var(--green)" }}>
              {col.icon}
            </span>
            <div>
              <p className="eyebrow" style={{ color: "var(--muted)" }}>
                {col.label}
              </p>
              <p className="display mt-2" style={{ fontSize: 24, lineHeight: 1.2 }}>
                {col.valueHref ? (
                  <a href={col.valueHref} style={{ color: "inherit", textDecoration: "none" }}>
                    {col.value}
                  </a>
                ) : (
                  col.value
                )}
              </p>
              <div className="mt-2 text-[14px]" style={{ color: "var(--muted)" }}>
                {col.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
