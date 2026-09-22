import Link from "next/link";

/**
 * PLACEHOLDER MARK — swap the SVG below for the client's real globe logo when it
 * arrives. Every logo on the site renders through this one component, so the swap is a
 * single-file change.
 */
export function GlobeMark({ size = 46, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 44 44"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <circle cx="22" cy="22" r="20" />
      <ellipse cx="22" cy="22" rx="9" ry="20" />
      <path d="M2 22h40M5 12h34M5 32h34" />
    </svg>
  );
}

export function Logo({ compact, onDark }: { compact?: boolean; onDark?: boolean }) {
  const markSize = compact ? 36 : 46;
  return (
    <Link
      href="/"
      className="flex items-center gap-3 no-underline"
      style={{ color: onDark ? "var(--paper)" : "var(--ink)" }}
      aria-label="Black Wall Street Liquid Lounge — home"
    >
      <GlobeMark size={markSize} className="shrink-0" />
      <span className="flex flex-col">
        <span
          className="font-semibold uppercase leading-none"
          style={{ fontSize: compact ? 9 : 11, letterSpacing: "0.24em" }}
        >
          Black Wall Street
        </span>
        <span
          className="display leading-none"
          style={{ fontSize: compact ? 21 : 27, fontWeight: 500, marginTop: 5 }}
        >
          Liquid Lounge
        </span>
      </span>
    </Link>
  );
}
