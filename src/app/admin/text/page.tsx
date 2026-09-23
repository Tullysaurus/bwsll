import Link from "next/link";
import { guardPage } from "../Guard";
import { HistoryLinks } from "../HistoryLinks";
import { COPY_PAGES } from "@/lib/field-labels";

export const dynamic = "force-dynamic";

/** One card per page of the site — the words are edited a page at a time. */
export default async function AdminTextIndex() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  return (
    <div className="max-w-[760px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Page text
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        Pick the page you want to reword. Hours, address and prices aren&rsquo;t here —
        they come from Hours and Business details, so they only have to be right once.
      </p>

      <ul className="mt-6 grid gap-3">
        {COPY_PAGES.map((page) => (
          <li key={page.slug}>
            <Link
              href={`/admin/text/${page.slug}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] p-5 no-underline"
              style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)" }}
            >
              <span>
                <span className="display block" style={{ fontSize: 20 }}>
                  {page.label}
                </span>
                <span className="text-[15px]" style={{ color: "var(--muted)" }}>
                  {page.blurb}
                </span>
              </span>
              <span className="link" style={{ fontSize: 15 }}>
                Edit →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <HistoryLinks keys={["copy"]} />
    </div>
  );
}
