import Link from "next/link";
import { notFound } from "next/navigation";
import { addSubscriber, removeSubscriber, saveInquiryDetails } from "../../actions";
import { DirtyForm } from "../../DirtyForm";
import { memberForInquiry } from "@/lib/club";
import { guardPage } from "../../Guard";
import { can } from "@/lib/permissions";
import { getInquiry, isSubscriber } from "@/lib/db";
import { formatCreatedAt, money } from "@/lib/format";
import { isSchedulable } from "@/lib/inquiry-events";
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
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const { id } = await params;
  const inquiry = await getInquiry(Number(id));
  if (!inquiry) notFound();

  // Staff must not reach a workforce application by typing its URL.
  if (inquiry.type === "workforce" && !can(guard.user.role, "inquiries.workforce")) notFound();

  const subscribed = await isSubscriber(inquiry.email);
  // Only asked for a club request, and only to decide which button to show.
  const member = inquiry.type === "club" ? await memberForInquiry(inquiry.id) : null;

  let data: Record<string, unknown> = {};
  let raw: string | null = null;
  try {
    data = JSON.parse(inquiry.data) as Record<string, unknown>;
  } catch {
    raw = inquiry.data;
  }

  const estimate = data.estimate as Estimate | undefined;
  // Recorded when the request came in: the room wasn't free at the time asked for.
  const clashes = Array.isArray(data.conflicts) ? (data.conflicts as string[]) : [];
  const entries = Object.entries(data).filter(
    ([key, value]) =>
      key !== "estimate" && key !== "conflicts" && value !== undefined && value !== "",
  );

  const subject = `Re: your ${inquiry.type} request — ${business.name}`;

  return (
    <div className="max-w-[820px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/inquiries" className="link">
          ← All inquiries
        </Link>
        <Link href={`/admin/history/inquiry/${inquiry.id}`} className="link">
          History
        </Link>
      </div>

      <h1 className="display mt-4" style={{ fontSize: 32 }}>
        {inquiry.name}
      </h1>

      {clashes.length ? (
        <div
          role="status"
          className="mt-4 p-4"
          style={{ border: "1px solid var(--gold)", background: "#fdf6e7", borderRadius: 2 }}
        >
          <p className="text-[16px] font-medium">The time they asked for wasn&rsquo;t free.</p>
          <ul className="mt-2 grid list-disc gap-1 pl-5 text-[15px]">
            {clashes.map((clash) => (
              <li key={clash}>{clash}</li>
            ))}
          </ul>
          <p className="mt-2 text-[14px]" style={{ color: "var(--muted)" }}>
            Checked when the request arrived. Worth suggesting another time when you reply.
          </p>
        </div>
      ) : null}
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
        {isSchedulable(inquiry) ? (
          <Link href={`/admin/events/new?from=${inquiry.id}`} className="btn btn-secondary">
            Add to calendar
          </Link>
        ) : null}
        {inquiry.type === "club" ? (
          member ? (
            <Link href={`/admin/club/${member.id}`} className="btn btn-secondary">
              Already a member →
            </Link>
          ) : (
            <Link href={`/admin/club/new?from=${inquiry.id}`} className="btn btn-secondary">
              Add as a member
            </Link>
          )
        ) : null}

        {subscribed ? (
          <form action={removeSubscriber} className="flex items-center gap-3">
            <input type="hidden" name="email" value={inquiry.email} />
            <input type="hidden" name="inquiryId" value={inquiry.id} />
            <span className="text-[15px]" style={{ color: "var(--muted)" }}>
              On the mailing list
            </span>
            <button type="submit" className="link">
              remove
            </button>
          </form>
        ) : (
          <form action={addSubscriber}>
            <input type="hidden" name="email" value={inquiry.email} />
            <input type="hidden" name="source" value={`inquiry:${inquiry.type}`} />
            <input type="hidden" name="inquiryId" value={inquiry.id} />
            <button type="submit" className="btn btn-secondary">
              Add to mailing list
            </button>
          </form>
        )}
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

      {/* One screen, one Save: status, notes and the payment record go together. */}
      <DirtyForm action={saveInquiryDetails} className="mt-8" saveLabel="Save this request">
        <input type="hidden" name="id" value={inquiry.id} />

        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className="field-label">
              Status
            </label>
            <select id="status" name="status" defaultValue={inquiry.status} className="field-input">
              <option value="new">New</option>
              <option value="replied">Replied</option>
              <option value="booked">Booked</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label htmlFor="pay_link" className="field-label">
              Payment link (optional)
            </label>
            <input
              id="pay_link"
              name="pay_link"
              type="url"
              placeholder="https://"
              className="field-input"
              defaultValue={inquiry.pay_link ?? ""}
            />
            <p className="field-hint">
              Wherever you sent them to pay. The site never takes payments itself.
            </p>
          </div>

          <div className="sm:col-span-2 grid gap-3">
            <label className="flex items-center gap-3 text-[16px]">
              <input
                type="checkbox"
                name="deposit_paid"
                className="checkbox"
                defaultChecked={inquiry.deposit_paid === 1}
              />
              Deposit paid
            </label>
            <label className="flex items-center gap-3 text-[16px]">
              <input
                type="checkbox"
                name="balance_paid"
                className="checkbox"
                defaultChecked={inquiry.balance_paid === 1}
              />
              Balance paid
            </label>
          </div>

          <div className="sm:col-span-2">
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
            <p className="field-hint">Only ever seen here.</p>
          </div>
        </div>
      </DirtyForm>

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
