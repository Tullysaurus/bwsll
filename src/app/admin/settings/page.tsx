import Link from "next/link";
import { guardPage } from "../Guard";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * One place for everything that's set up once and rarely touched, so the menu on the
 * left can stay short. Owner-only screens are simply absent for staff.
 */
export default async function AdminSettingsIndex() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const { role } = guard.user;

  const cards = [
    {
      href: "/admin/announcement",
      label: "Top bar message",
      blurb: "The strip across the top of every page, and the closed notice.",
      show: true,
    },
    {
      href: "/admin/hours",
      label: "Hours & closed days",
      blurb: "Your normal week, plus holidays and one-off changes.",
      show: true,
    },
    {
      href: "/admin/business",
      label: "Business details",
      blurb: "Address, phone, email, social links, order-ahead and delivery.",
      show: can(role, "settings.business"),
    },
    {
      href: "/admin/settings/prices",
      label: "Prices & replies",
      blurb: "Room rental prices and how soon you promise to reply.",
      show: true,
    },
    {
      href: "/admin/legal",
      label: "Privacy & terms",
      blurb: "The legal text at the bottom of the site.",
      show: can(role, "settings.legal"),
    },
    {
      href: "/admin/team",
      label: "Who can sign in",
      blurb: "Add or remove the people who can use this admin.",
      show: can(role, "team.manage"),
    },
    {
      href: "/admin/trash",
      label: "Deleted items",
      blurb: "Anything deleted in the last while — put it back from here.",
      show: true,
    },
  ].filter((card) => card.show);

  return (
    <div className="max-w-[760px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Settings
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        The things you set once and rarely change.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="block h-full rounded-[2px] p-5 no-underline"
              style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)" }}
            >
              <span className="display block" style={{ fontSize: 20 }}>
                {card.label}
              </span>
              <span className="mt-1 block text-[15px]" style={{ color: "var(--muted)" }}>
                {card.blurb}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
