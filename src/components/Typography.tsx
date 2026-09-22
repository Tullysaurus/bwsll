import type { ReactNode } from "react";

export function Eyebrow({
  children,
  gold,
  as: Tag = "p",
  className = "",
}: {
  children: ReactNode;
  gold?: boolean;
  as?: "p" | "h2" | "h3" | "span" | "div";
  className?: string;
}) {
  return <Tag className={`eyebrow ${gold ? "eyebrow-gold" : ""} ${className}`}>{children}</Tag>;
}

/**
 * Section header: optional eyebrow + H2 on the left, with an intro paragraph or a link
 * aligned to the right on the same baseline (§4.5).
 */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  aside,
  gold,
  id,
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  aside?: ReactNode;
  gold?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16 ${className}`}>
      <div className="max-w-[760px]">
        {eyebrow ? (
          <Eyebrow gold={gold} className="mb-4">
            {eyebrow}
          </Eyebrow>
        ) : null}
        <h2 id={id} className="h2">
          {title}
        </h2>
      </div>
      {intro ? (
        <p
          className="max-w-[420px] body-lg lg:text-right"
          style={{ color: gold ? "var(--green-soft-text)" : "var(--muted)" }}
        >
          {intro}
        </p>
      ) : null}
      {aside ? <div className="shrink-0 lg:pb-2">{aside}</div> : null}
    </div>
  );
}

/**
 * The intro block shared by every inner page: eyebrow, H1 whose last phrase is italic,
 * a lead paragraph and optional right-hand content.
 */
export function PageIntro({
  eyebrow,
  titleStart,
  titleItalic,
  intro,
  aside,
  large,
}: {
  eyebrow: string;
  titleStart: string;
  titleItalic: string;
  intro?: ReactNode;
  aside?: ReactNode;
  large?: boolean;
}) {
  return (
    <div className="shell gutter pt-14 pb-12 md:pt-20 md:pb-16 lg:pt-24 lg:pb-16">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
        <div className="max-w-[760px]">
          <Eyebrow className="mb-5">{eyebrow}</Eyebrow>
          <h1 className={large ? "h1-page-lg" : "h1-page"}>
            {titleStart} <em className="italic">{titleItalic}</em>
          </h1>
          {intro ? (
            <p className="mt-7 max-w-[620px] body-lg" style={{ color: "var(--muted)" }}>
              {intro}
            </p>
          ) : null}
        </div>
        {aside ? <div className="lg:text-right">{aside}</div> : null}
      </div>
    </div>
  );
}
