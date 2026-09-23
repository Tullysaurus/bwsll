import Link from "next/link";
import type { Metadata } from "next";
import { countNewInquiries } from "@/lib/db";
import { currentAdmin, currentEmail } from "@/lib/auth";
import { can, ROLE_LABEL } from "@/lib/permissions";
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

  const tabs = [
    { href: "/admin/inquiries", label: "Inquiries", badge: newCount },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/settings", label: "Settings" },
    { href: "/admin/subscribers", label: "Subscribers" },
    { href: "/admin/trash", label: "Trash" },
    ...(can(user.role, "team.manage") ? [{ href: "/admin/team", label: "Team" }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row" style={{ background: "var(--cream)" }}>
      <aside
        className="shrink-0 md:w-[220px]"
        style={{ background: "var(--paper)", borderRight: "1px solid var(--line)" }}
      >
        <div className="p-5" style={{ borderBottom: "1px solid var(--line)" }}>
          <p className="display" style={{ fontSize: 22 }}>
            Liquid Lounge
          </p>
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            Admin
          </p>
        </div>
        <nav aria-label="Admin sections" className="no-scrollbar flex gap-1 overflow-x-auto p-3 md:flex-col">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-[2px] px-3 py-2 text-[15px] font-medium no-underline"
              style={{ color: "var(--ink)" }}
            >
              {tab.label}
              {tab.badge ? (
                <span
                  className="rounded-full px-2 py-[2px] text-[12px] font-semibold"
                  style={{ background: "var(--green)", color: "var(--paper)" }}
                >
                  {tab.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <p className="text-[14px]" style={{ color: "var(--muted)" }}>
            Signed in as {user.email} · {ROLE_LABEL[user.role]}
            {user.fromConfig ? " (set in config)" : ""}
          </p>
          <Link href="/" className="link">
            View site
          </Link>
        </header>
        <main className="flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
