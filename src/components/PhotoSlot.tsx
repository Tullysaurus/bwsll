import type { CSSProperties } from "react";
import type { PhotoTone } from "@/content/photos";
import { getPhotoSlot } from "@/lib/photos";

const TONE_BG: Record<PhotoTone, string> = {
  light: "var(--ph-light)",
  "light-2": "var(--ph-light-2)",
  dark: "var(--ph-dark)",
  "dark-2": "var(--ph-dark-2)",
  green: "var(--green-deep)",
};

const TONE_LABEL: Record<PhotoTone, string> = {
  light: "var(--ph-label)",
  "light-2": "var(--ph-label)",
  dark: "var(--footer-muted)",
  "dark-2": "var(--footer-muted)",
  green: "#BFD0C6",
};

/**
 * Every image goes through here (v1 §4.4). The slot — never the photo — sets the size,
 * so a layout is identical whether the owner has uploaded an image yet or not.
 *
 * Async because the current image comes from D1 (v2 §4.5); with nothing uploaded it
 * renders exactly the labelled placeholder it always did. Nothing client-side imports
 * this component, so awaiting here is safe.
 */
export async function PhotoSlot({
  id,
  className = "",
  style,
  priority,
  sizeHint,
  labelAlign = "bottom",
  overlay,
}: {
  id: string;
  className?: string;
  style?: CSSProperties;
  /** Hero only: eager-load with high fetch priority. */
  priority?: boolean;
  /** Rendered width/height attributes to reserve layout space. */
  sizeHint?: { width: number; height: number };
  /** The hero anchors its copy to the bottom, so its label sits at the top instead. */
  labelAlign?: "bottom" | "top";
  /** Darkens a real photo so light copy over it stays legible (v1 §5.1.2). */
  overlay?: boolean;
}) {
  const data = await getPhotoSlot(id);

  if (data.src) {
    return (
      <figure className={`relative m-0 overflow-hidden ${className}`} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.src}
          alt={data.alt}
          width={data.width ?? sizeHint?.width}
          height={data.height ?? sizeHint?.height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding={priority ? "sync" : "async"}
          className="h-full w-full object-cover"
        />
        {overlay ? (
          <div className="absolute inset-0" style={{ background: "rgba(30,24,19,0.45)" }} aria-hidden="true" />
        ) : null}
        {data.credit ? (
          <figcaption className="photo-credit">
            {data.credit.url ? (
              <a href={data.credit.url} target="_blank" rel="noreferrer">
                {data.credit.text}
              </a>
            ) : (
              data.credit.text
            )}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: TONE_BG[data.tone], ...style }}
      role="img"
      aria-label={data.alt}
    >
      {data.label ? (
        <span
          className={`absolute left-0 ${labelAlign === "top" ? "top-0" : "bottom-0"} p-[14px] md:p-[22px] pr-6 text-[11px] font-semibold uppercase leading-snug`}
          style={{ color: TONE_LABEL[data.tone], letterSpacing: "0.16em" }}
        >
          {data.label}
        </span>
      ) : null}
    </div>
  );
}
