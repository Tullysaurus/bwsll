import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "../EventForm";
import { InquiryPicker } from "../InquiryPicker";
import { deleteEvent } from "../../actions";
import { guardPage } from "../../Guard";
import { DeleteEventButton } from "../DeleteEventButton";
import { getEvent, getInquiry, listBookingInquiries } from "@/lib/db";
import { eventDefaultsFromInquiry, inquirySummary, isSchedulable } from "@/lib/inquiry-events";

export const dynamic = "force-dynamic";

export default async function AdminEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const [{ id }, { from }] = await Promise.all([params, searchParams]);

  if (id === "new") {
    const fromId = Number(from);
    const [inquiries, source] = await Promise.all([
      listBookingInquiries(),
      Number.isInteger(fromId) && fromId > 0 ? getInquiry(fromId) : null,
    ]);
    const usable = source && isSchedulable(source) ? source : null;

    return (
      <div>
        <Link href="/admin/events" className="link">
          ← All events
        </Link>
        <h1 className="display mt-4" style={{ fontSize: 32 }}>
          New event
        </h1>

        <div className="mt-6 pb-6" style={{ borderBottom: "1px solid var(--line)" }}>
          <InquiryPicker inquiries={inquiries.filter(isSchedulable)} selectedId={usable?.id} />
        </div>

        {usable ? (
          <p
            className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-[15px]"
            style={{ background: "var(--paper)", border: "1px solid var(--line-strong)" }}
          >
            <span>Prefilled from the {inquirySummary(usable)}</span>
            <Link href={`/admin/inquiries/${usable.id}`} className="link">
              View request
            </Link>
            <Link href="/admin/events/new" className="link-muted">
              Clear
            </Link>
          </p>
        ) : null}

        {source && !usable ? (
          <p className="mt-6 text-[15px]" style={{ color: "var(--muted)" }} role="status">
            That request has no event date, so there was nothing to autofill.
          </p>
        ) : null}

        <div className="mt-6">
          {/* Keyed so picking a different request remounts the inputs with new defaults. */}
          <EventForm
            key={usable?.id ?? "blank"}
            defaults={usable ? eventDefaultsFromInquiry(usable) : undefined}
            inquiryId={usable?.id}
          />
        </div>
      </div>
    );
  }

  const event = await getEvent(Number(id));
  if (!event) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/events" className="link">
          ← All events
        </Link>
        <Link href={`/admin/history/event/${event.id}`} className="link">
          History
        </Link>
      </div>
      <h1 className="display mt-4" style={{ fontSize: 32 }}>
        Edit event
      </h1>
      <div className="mt-6">
        <EventForm event={event} />
      </div>

      <form action={deleteEvent} className="mt-10 pt-6" style={{ borderTop: "1px solid var(--line)" }}>
        <input type="hidden" name="id" value={event.id} />
        <DeleteEventButton />
        <p className="mt-2 text-[14px]" style={{ color: "var(--muted)" }}>
          This can&rsquo;t be undone.
        </p>
      </form>
    </div>
  );
}
