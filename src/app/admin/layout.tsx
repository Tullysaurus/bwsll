import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { countNewInquiries } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const tabs = [
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/subscribers", label: "Subscribers" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [headerList, newCount] = await Promise.all([headers(), countNewInquiries()]);
  const email = headerList.get("x-access-email") ?? "";

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
        <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto p-3 md:flex-col">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-[2px] px-3 py-2 text-[15px] font-medium no-underline"
              style={{ color: "var(--ink)" }}
            >
              {tab.label}
              {tab.href === "/admin/inquiries" && newCount > 0 ? (
                <span
                  className="rounded-full px-2 py-[2px] text-[12px] font-semibold"
                  style={{ background: "var(--green)", color: "var(--paper)" }}
                >
                  {newCount}
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
            {email ? `Signed in as ${email}` : "Signed in via Cloudflare Access"}
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
