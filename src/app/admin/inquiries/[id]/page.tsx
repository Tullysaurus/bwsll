import Link from "next/link";
import { notFound } from "next/navigation";
import { saveInquiryNotes, setInquiryStatus } from "../../actions";
import { getInquiry } from "@/lib/db";
import { formatCreatedAt, money } from "@/lib/format";
import type { Estimate } from "@/lib/schemas";
import { business } from "@/content/business";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  organization: "Organization",
  eventDate: "Event date",
  startTime: "Start time",
  endTime: "End time",
  guests: "Guests",
  need: "What they need",
  venueAddress: "Venue address",
  startDate: "Preferred start",
  businessName: "Business name",
  businessWebsite: "Website",
  productType: "Products",
  hasLicense: "Business license",
  hasInsurance: "Proof of insurance",
  program: "Program",
  city: "City",
  school: "School",
  isUnder18: "Under 18",
  guardianName: "Parent / guardian",
  guardianEmail: "Guardian email",
  message: "Message",
};

export default async function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inquiry = await getInquiry(Number(id));
  if (!inquiry) notFound();

  let data: Record<string, unknown> = {};
  let raw: string | null = null;
  try {
    data = JSON.parse(inquiry.data) as Record<string, unknown>;
  } catch {
    raw = inquiry.data;
  }

  const estimate = data.estimate as Estimate | undefined;
  const entries = Object.entries(data).filter(
    ([key, value]) => key !== "estimate" && value !== undefined && value !== "",
  );

  const subject = `Re: your ${inquiry.type} request — ${business.name}`;

  return (
    <div className="max-w-[820px]">
      <Link href="/admin/inquiries" className="link">
        ← All inquiries
      </Link>

      <h1 className="display mt-4" style={{ fontSize: 32 }}>
        {inquiry.name}
      </h1>
      <p className="mt-1 text-[15px]" style={{ color: "var(--muted)" }}>
        {inquiry.type} · received {formatCreatedAt(inquiry.created_at)}
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={`mailto:${inquiry.email}?subject=${encodeURIComponent(subject)}`}
          className="btn btn-primary"
        >
          Reply by email
        </a>
        {inquiry.phone ? (
          <a href={`tel:${inquiry.phone.replace(/[^\d+]/g, "")}`} className="btn btn-secondary">
            Call
          </a>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="display" style={{ fontSize: 22 }}>
          Submitted details
        </h2>
        <dl className="rule-top-ink mt-3">
          <Row label="Email" value={<a href={`mailto:${inquiry.email}`} className="link">{inquiry.email}</a>} />
          {inquiry.phone ? <Row label="Phone" value={inquiry.phone} /> : null}
          {entries.map(([key, value]) => (
            <Row
              key={key}
              label={LABELS[key] ?? key}
              value={typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
            />
          ))}
        </dl>
        {raw ? (
          <pre className="mt-4 overflow-x-auto p-3 text-[13px]" style={{ background: "var(--paper)" }}>
            {raw}
          </pre>
        ) : null}
      </section>

      {estimate ? (
        <section className="mt-8">
          <h2 className="display" style={{ fontSize: 22 }}>
            Catering estimate
          </h2>
          <p className="mt-1 text-[15px]" style={{ color: "var(--muted)" }}>
            Up to {estimate.guests} guests
          </p>
          <ul className="rule-top-ink mt-3 list-none">
            {estimate.items.map((item) => (
              <li
                key={item.name}
                className="flex justify-between py-2 text-[16px]"
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <span>{item.name}</span>
                <span className="tnum">{money(item.price)}</span>
              </li>
            ))}
            <li className="flex justify-between py-3 text-[17px] font-semibold">
              <span>Total</span>
              <span className="tnum">{money(estimate.total)}</span>
            </li>
          </ul>
        </section>
      ) : null}

      <section className="mt-8 grid gap-8 sm:grid-cols-2">
        <form action={setInquiryStatus}>
          <input type="hidden" name="id" value={inquiry.id} />
          <label htmlFor="status" className="field-label">
            Status
          </label>
          <select id="status" name="status" defaultValue={inquiry.status} className="field-input">
            <option value="new">New</option>
            <option value="replied">Replied</option>
            <option value="booked">Booked</option>
            <option value="closed">Closed</option>
          </select>
          <button type="submit" className="btn btn-secondary mt-3">
            Save status
          </button>
        </form>

        <form action={saveInquiryNotes}>
          <input type="hidden" name="id" value={inquiry.id} />
          <label htmlFor="notes" className="field-label">
            Private notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={5}
            className="field-input"
            defaultValue={inquiry.notes ?? ""}
          />
          <button type="submit" className="btn btn-secondary mt-3">
            Save notes
          </button>
        </form>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      className="grid gap-1 py-3 sm:grid-cols-[200px_1fr] sm:gap-4"
      style={{ borderBottom: "1px solid var(--line)" }}
    >
      <dt className="text-[14px]" style={{ color: "var(--muted)" }}>
        {label}
      </dt>
      <dd className="text-[16px] whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
