import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "../EventForm";
import { deleteEvent } from "../../actions";
import { DeleteEventButton } from "../DeleteEventButton";
import { getEvent } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (id === "new") {
    return (
      <div>
        <Link href="/admin/events" className="link">
          ← All events
        </Link>
        <h1 className="display mt-4" style={{ fontSize: 32 }}>
          New event
        </h1>
        <div className="mt-6">
          <EventForm />
        </div>
      </div>
    );
  }

  const event = await getEvent(Number(id));
  if (!event) notFound();

  return (
    <div>
      <Link href="/admin/events" className="link">
        ← All events
      </Link>
      <h1 className="display mt-4" style={{ fontSize: 32 }}>
        Edit event
      </h1>
      <div className="mt-6">
        <EventForm event={event} />
      </div>

      <form
        action={deleteEvent}
        className="mt-10 pt-6"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        <input type="hidden" name="id" value={event.id} />
        <DeleteEventButton />
        <p className="mt-2 text-[14px]" style={{ color: "var(--muted)" }}>
          This can&rsquo;t be undone.
        </p>
      </form>
    </div>
  );
}
