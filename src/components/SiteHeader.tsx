"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./Button";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { nav } from "@/content/business";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-40"
      style={{ background: "var(--cream)", borderBottom: "1px solid var(--line)" }}
    >
      <div className="shell gutter flex items-center justify-between gap-8" style={{ paddingBlock: 22 }}>
        <div className="xl:hidden">
          <Logo compact />
        </div>
        <div className="hidden xl:block">
          <Logo />
        </div>

        <nav className="hidden items-center xl:flex" style={{ gap: 34 }} aria-label="Main">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="no-underline"
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: active ? "var(--green)" : "var(--ink)",
                  textDecoration: active ? "underline" : "none",
                  textUnderlineOffset: 6,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden xl:block">
          <Button href="/private-events#inquire" compact>
            Plan an event
          </Button>
        </div>

        <MobileNav />
      </div>
    </header>
  );
}
