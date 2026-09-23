"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The admin menu: grouped by the job you came here to do, rather than one flat list.
 * On a phone it collapses into a single "Menu" disclosure that shows where you are; the
 * `key={pathname}` remounts it closed after every move, with no effect needed.
 */

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
  /** Extra routes that belong to this item — the screens behind Settings, say. */
  match?: string[];
};
export type NavGroup = { title?: string; items: NavItem[] };

function under(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActive(pathname: string, item: NavItem) {
  return under(pathname, item.href) || (item.match ?? []).some((href) => under(pathname, href));
}

function Item({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="flex min-h-[44px] items-center justify-between gap-2 rounded-[2px] px-3 py-2 text-[15px] no-underline"
      style={{
        background: active ? "var(--green)" : "transparent",
        color: active ? "var(--paper)" : "var(--ink)",
        fontWeight: active ? 600 : 500,
      }}
    >
      <span>{item.label}</span>
      {item.badge ? (
        <span
          className="rounded-full px-2 py-[2px] text-[12px] font-semibold"
          style={{
            background: active ? "var(--paper)" : "var(--green)",
            color: active ? "var(--green)" : "var(--paper)",
          }}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function Groups({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  return (
    <>
      {groups.map((group, index) => (
        <div key={group.title ?? index} className={index === 0 ? "" : "mt-5"}>
          {group.title ? (
            <p
              className="px-3 pb-1 text-[12px] font-semibold uppercase"
              style={{ letterSpacing: "0.1em", color: "var(--muted)" }}
            >
              {group.title}
            </p>
          ) : null}
          <div className="grid gap-1">
            {group.items.map((item) => (
              <Item key={item.href} item={item} active={isActive(pathname, item)} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const here =
    groups.flatMap((g) => g.items).find((item) => isActive(pathname, item))?.label ?? "Menu";

  return (
    <>
      {/* Phone: one disclosure, so the menu never pushes the page down. */}
      <details key={pathname} className="md:hidden" style={{ borderBottom: "1px solid var(--line)" }}>
        <summary className="flex min-h-[52px] cursor-pointer items-center gap-2 px-5 text-[15px] font-semibold">
          {here} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· tap to switch</span>
        </summary>
        <nav aria-label="Admin sections" className="p-3 pt-0">
          <Groups groups={groups} pathname={pathname} />
        </nav>
      </details>

      <nav aria-label="Admin sections" className="hidden p-3 md:block">
        <Groups groups={groups} pathname={pathname} />
      </nav>
    </>
  );
}
