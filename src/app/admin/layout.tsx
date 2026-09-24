import Link from "next/link";
import type { Metadata } from "next";
import { countNewInquiries } from "@/lib/db";
import { currentAdmin, currentEmail } from "@/lib/auth";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { AdminNav, type NavGroup } from "./AdminNav";
import { NoAccess } from "./Guard";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentAdmin();

  // Not on the allowlist: replace the whole admin shell with an explanation. Pages and
  // server actions check again themselves — this layout never runs for an action POST.
  if (!user) {
    return (
      <div className="min-h-screen p-6 md:p-10" style={{ background: "var(--cream)" }}>
        <NoAccess email={await currentEmail()} />
      </div>
    );
  }

  // Staff never see workforce applications, including in the "new" badge.
  const newCount = await countNewInquiries(can(user.role, "inquiries.workforce") ? [] : ["workforce"]);
  const settings = await getSettings();
  const bannerLive = Boolean(settings.closure_notice.trim());

  // Short on purpose: four groups, and everything that is set up once lives behind
  // Settings. Staff and owners see the same menu — the owner-only screens are inside.
  const groups: NavGroup[] = [
    { items: [{ href: "/admin", label: "Home" }] },
    {
      title: "From visitors",
      items: [
        { href: "/admin/inquiries", label: "Messages", badge: newCount },
        { href: "/admin/subscribers", label: "Mailing list" },
      ],
    },
    {
      title: "Your website",
      items: [
        { href: "/admin/events", label: "Events" },
        { href: "/admin/menu", label: "Menu" },
        { href: "/admin/catering", label: "Catering" },
        { href: "/admin/photos", label: "Photos" },
        { href: "/admin/text", label: "Page text" },
        { href: "/admin/documents", label: "Files & menus" },
      ],
    },
    {
      items: [
        {
          href: "/admin/settings",
          label: "Settings",
          match: ["/admin/announcement", "/admin/hours", "/admin/business", "/admin/legal", "/admin/team", "/admin/trash"],
        },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row" style={{ background: "var(--cream)" }}>
      <aside
        className="shrink-0 md:sticky md:top-0 md:h-screen md:w-[240px] md:overflow-y-auto"
        style={{ background: "var(--paper)", borderRight: "1px solid var(--line)" }}
      >
        <div className="p-5" style={{ borderBottom: "1px solid var(--line)" }}>
          <p className="display" style={{ fontSize: 22 }}>
            Liquid Lounge
          </p>
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            Website admin
          </p>
        </div>
        <AdminNav groups={groups} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid var(--line)", background: "var(--cream)" }}
        >
          <p className="text-[14px]" style={{ color: "var(--muted)" }}>
            Signed in as {user.email} · {ROLE_LABEL[user.role]}
            {user.fromConfig ? " (set in config)" : ""}
          </p>
          <div className="flex items-center gap-4">
            {bannerLive ? (
              <Link href="/admin/announcement" className="link" style={{ fontSize: 14 }}>
                Closed notice is showing
              </Link>
            ) : null}
            <Link href="/" className="link">
              View site
            </Link>
          </div>
        </header>
        <main className="flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
