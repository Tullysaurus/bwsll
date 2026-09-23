"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { CloseIcon, MenuIcon } from "./Icons";
import { Logo } from "./Logo";
import { nav } from "@/content/business";

/** Full-screen drawer for < 1200px (§4.2): focus-trapped, Esc closes, body scroll locked. */
export function MobileNav({ orderAhead = "" }: { orderAhead?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      ).filter((el) => el.offsetParent !== null);

    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center xl:hidden"
        style={{ border: "1px solid var(--line-strong)", borderRadius: 2, color: "var(--ink)" }}
      >
        <MenuIcon />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto xl:hidden"
          style={{ background: "var(--cream)" }}
        >
          <div className="gutter flex items-start justify-between" style={{ paddingBlock: 22 }}>
            <Logo compact />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Close menu"
              className="flex h-11 w-11 items-center justify-center"
              style={{ border: "1px solid var(--line-strong)", borderRadius: 2 }}
            >
              <CloseIcon />
            </button>
          </div>

          <nav className="gutter flex flex-1 flex-col gap-1 pt-6" aria-label="Main">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="display py-3 no-underline"
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  style={{
                    fontSize: 36,
                    lineHeight: 1.15,
                    color: active ? "var(--green)" : "var(--ink)",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="gutter grid gap-3 pb-10 pt-8">
            {orderAhead ? (
              <Button href={orderAhead} variant="gold" fullWidth onClick={() => setOpen(false)}>
                Order ahead
              </Button>
            ) : null}
            <Button href="/private-events#inquire" fullWidth onClick={() => setOpen(false)}>
              Plan an event
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
