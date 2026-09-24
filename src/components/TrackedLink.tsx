"use client";

import { track } from "./track";

/**
 * A link that counts itself when it's used. Everything it counts is a deliberate action
 * — opening the menu PDF, tapping the phone number, going to the ordering page — which
 * is what makes the numbers worth anything.
 */
export function TrackedLink({
  href,
  event,
  className,
  children,
  external = true,
  style,
  ...rest
}: {
  href: string;
  event: string;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
  style?: React.CSSProperties;
} & Omit<React.ComponentProps<"a">, "href" | "className" | "children" | "style">) {
  return (
    <a
      href={href}
      className={className}
      style={style}
      onClick={() => track(event)}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}
