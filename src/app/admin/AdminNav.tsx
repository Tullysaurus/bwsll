"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The admin menu: one short list, most-used first. On a phone it collapses into a single
 * "Menu" disclosure that shows where you are; the `key={pathname}` remounts it closed
 * after every move, with no effect needed.
 */

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
  /** Extra routes that belong to this item — the screens behind Settings, say. */
  match?: string[];
  /** Active only on its own route — for Home, which every admin route sits under. */
  exact?: boolean;
};

function under(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
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

function Items({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <div className="grid gap-1">
      {items.map((item) => (
        <Item key={item.href} item={item} active={isActive(pathname, item)} />
      ))}
    </div>
  );
}

export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const here = items.find((item) => isActive(pathname, item))?.label ?? "Menu";

  return (
    <>
      {/* Phone: one disclosure, so the menu never pushes the page down. */}
      <details key={pathname} className="md:hidden" style={{ borderBottom: "1px solid var(--line)" }}>
        <summary className="flex min-h-[52px] cursor-pointer items-center gap-2 px-5 text-[15px] font-semibold">
          {here} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· tap to switch</span>
        </summary>
        <nav aria-label="Admin sections" className="p-3 pt-0">
          <Items items={items} pathname={pathname} />
        </nav>
      </details>

      <nav aria-label="Admin sections" className="hidden p-3 md:block">
        <Items items={items} pathname={pathname} />
      </nav>
    </>
  );
}
