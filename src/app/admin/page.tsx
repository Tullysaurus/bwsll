import Link from "next/link";
import { countNewInquiries, getUpcomingEvents, listSubscribers } from "@/lib/db";
import { currentAdmin } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { fullEventLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * The first screen after signing in: what needs attention today, then the handful of
 * things people actually come here to do. Everything else lives in the menu.
 */

function Card({
  href,
  title,
  body,
  accent,
}: {
  href: string;
  title: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[2px] p-5 no-underline"
      style={{
        background: accent ? "var(--green)" : "var(--paper)",
        color: accent ? "var(--paper)" : "var(--ink)",
        border: "1px solid var(--line)",
      }}
    >
      <p className="display" style={{ fontSize: 20 }}>
        {title}
      </p>
      <p className="mt-1 text-[15px]" style={{ color: accent ? "var(--paper)" : "var(--muted)" }}>
        {body}
      </p>
    </Link>
  );
}

export default async function AdminHome() {
  const user = await currentAdmin();
  if (!user) return null; // The layout has already shown the "no access" screen.

  const seesWorkforce = can(user.role, "inquiries.workforce");
  const [newCount, events, subscribers, settings] = await Promise.all([
    countNewInquiries(seesWorkforce ? [] : ["workforce"]),
    getUpcomingEvents(3),
    listSubscribers(),
    getSettings(),
  ]);

  const closed = settings.closure_notice.trim();

  return (
    <div className="max-w-[860px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Hi — here&rsquo;s where things stand
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card
          href="/admin/inquiries"
          accent={newCount > 0}
          title={newCount > 0 ? `${newCount} new message${newCount === 1 ? "" : "s"}` : "No new messages"}
          body={newCount > 0 ? "People waiting on a reply." : "Everything here has been read."}
        />
        <Card
          href="/admin/announcement"
          title={closed ? "Closed notice is up" : "Top bar message"}
          body={closed ? closed : settings.announcement.trim() || "Nothing showing at the top of the site."}
        />
        <Card
          href="/admin/events"
          title={events.length ? "Next event" : "No events coming up"}
          body={
            events.length
              ? `${events[0].title} — ${fullEventLabel(events[0].starts_at, events[0].ends_at)}`
              : "Add one so it shows on the website."
          }
        />
        <Card
          href="/admin/subscribers"
          title={`${subscribers.length} on the mailing list`}
          body="Download the list to send an email."
        />
      </div>

      <h2 className="display mt-10" style={{ fontSize: 22 }}>
        Common jobs
      </h2>
      <ul className="mt-3 grid gap-2 text-[17px]">
        {[
          { href: "/admin/events/new", label: "Add an event" },
          { href: "/admin/hours", label: "Mark a day closed" },
          { href: "/admin/menu", label: "Change a price on the menu" },
          { href: "/admin/photos", label: "Change a photo on the site" },
          { href: "/admin/documents", label: "Put up a new menu or flyer" },
          { href: "/admin/hours", label: "Change opening hours" },
          { href: "/admin/text", label: "Reword something on a page" },
        ].map((item) => (
          <li key={item.label}>
            <Link href={item.href} className="link">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-[15px]" style={{ color: "var(--muted)" }}>
        Nothing you change here goes live until you press Save. Deleted things go to{" "}
        <Link href="/admin/trash" className="link">
          Deleted items
        </Link>{" "}
        and can be put back.
      </p>
    </div>
  );
}
