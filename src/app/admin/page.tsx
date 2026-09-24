import Link from "next/link";
import { countNewInquiries, getUpcomingEvents, listSubscribers } from "@/lib/db";
import { currentAdmin } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { countsByName, EVENT_LABEL, weeklyTotals, type TrackedEvent } from "@/lib/analytics";
import { ActivityChart } from "./ActivityChart";
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
  const [newCount, events, subscribers, settings, weeks, byName] = await Promise.all([
    countNewInquiries(seesWorkforce ? [] : ["workforce"]),
    getUpcomingEvents(3),
    listSubscribers(),
    getSettings(),
    weeklyTotals(),
    countsByName(30),
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

      <section className="mt-12">
        <h2 className="display" style={{ fontSize: 22 }}>
          How the site is doing
        </h2>
        <p className="mt-1 text-[15px]" style={{ color: "var(--muted)" }}>
          Things people did on the website — tapped the phone number, opened the menu,
          sent a request. Counts only: nothing here says who anyone is.
        </p>

        <ActivityChart weeks={weeks} />

        {byName.length ? (
          <dl className="mt-6 grid gap-x-6 gap-y-2 sm:grid-cols-[1fr_auto]">
            {byName.map((row) => (
              <div key={row.name} className="contents">
                <dt className="text-[16px]">
                  {EVENT_LABEL[row.name as TrackedEvent] ?? row.name}
                </dt>
                <dd className="text-[16px] font-medium sm:text-right">{row.count}</dd>
              </div>
            ))}
            <div className="contents">
              <dt className="text-[14px] sm:col-span-2" style={{ color: "var(--muted)" }}>
                Last 30 days.
              </dt>
            </div>
          </dl>
        ) : null}
      </section>

      <h2 className="display mt-12" style={{ fontSize: 22 }}>
        Common jobs
      </h2>
      <ul className="mt-3 grid gap-2 text-[17px]">
        {[
          { href: "/admin/events/new", label: "Add an event" },
          { href: "/admin/hours", label: "Mark a day closed" },
          { href: "/admin/menu", label: "Change a price on the menu" },
          { href: "/admin/club", label: "Check who's in the club" },
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
        New here?{" "}
        <Link href="/admin/help" className="link">
          How to do the usual things
        </Link>
        . Nothing you change goes live until you press Save, and deleted things go to{" "}
        <Link href="/admin/trash" className="link">
          Deleted items
        </Link>{" "}
        and can be put back.
      </p>
    </div>
  );
}
