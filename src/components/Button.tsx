import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "onDarkSolid" | "onDarkOutline" | "gold";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  onDarkSolid: "btn-on-dark-solid",
  onDarkOutline: "btn-on-dark-outline",
  gold: "btn-gold",
};

type CommonProps = {
  variant?: ButtonVariant;
  /** Nav-sized padding (14px 22px) instead of the default 16px 24px. */
  compact?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

type AnchorProps = CommonProps & { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;
type NativeProps = CommonProps & { href?: undefined } & Omit<
    ComponentProps<"button">,
    "className" | "children"
  >;

export function Button(props: AnchorProps | NativeProps) {
  const { variant = "primary", compact, fullWidth, className = "", children, ...rest } = props;
  const classes = [
    "btn",
    VARIANT_CLASS[variant],
    compact ? "btn-nav" : "",
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if ("href" in rest && typeof rest.href === "string") {
    const { href, ...anchorRest } = rest as AnchorProps;
    const external = /^(https?:|mailto:|tel:)/.test(href);
    if (external) {
      return (
        <a
          href={href}
          className={classes}
          {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
          {...(anchorRest as ComponentProps<"a">)}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonRest } = rest as NativeProps;
  return (
    <button type={type} className={classes} {...buttonRest}>
      {children}
    </button>
  );
}

/** Text link with the trailing arrow used for "go to" links throughout the site. */
export function ArrowLink({
  href,
  children,
  onDark,
  className = "",
}: {
  href: string;
  children: ReactNode;
  onDark?: boolean;
  className?: string;
}) {
  const classes = ["link", onDark ? "link-on-dark" : "", className].filter(Boolean).join(" ");
  const external = /^https?:/.test(href);
  const content = (
    <>
      {children} <span aria-hidden="true">→</span>
    </>
  );
  return external ? (
    <a href={href} className={classes} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
