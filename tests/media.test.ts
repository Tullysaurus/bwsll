import { describe, expect, it } from "vitest";
import {
  ACCEPTED_TYPES,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  isAcceptedType,
  isServableKey,
  keyFor,
  maxBytesFor,
  mediaUrl,
} from "@/lib/media";

const HASH = "a".repeat(64);

describe("content-addressed keys", () => {
  it("routes images and PDFs to their own prefixes", () => {
    expect(keyFor(HASH, "image/webp")).toBe(`media/${HASH}.webp`);
    expect(keyFor(HASH, "image/jpeg")).toBe(`media/${HASH}.jpg`);
    expect(keyFor(HASH, "image/png")).toBe(`media/${HASH}.png`);
    expect(keyFor(HASH, "application/pdf")).toBe(`files/${HASH}.pdf`);
  });

  it("derives URLs from keys, never the other way round", () => {
    expect(mediaUrl(`media/${HASH}.webp`)).toBe(`/media/media/${HASH}.webp`);
  });
});

describe("upload validation", () => {
  it("accepts only the four supported types", () => {
    for (const type of ACCEPTED_TYPES) expect(isAcceptedType(type)).toBe(true);
    for (const type of ["image/gif", "image/svg+xml", "text/html", "application/zip", ""]) {
      expect(isAcceptedType(type), type).toBe(false);
    }
  });

  it("gives PDFs a larger budget than images", () => {
    expect(maxBytesFor("application/pdf")).toBe(MAX_PDF_BYTES);
    expect(maxBytesFor("image/webp")).toBe(MAX_IMAGE_BYTES);
    expect(MAX_PDF_BYTES).toBeGreaterThan(MAX_IMAGE_BYTES);
  });
});

describe("servable keys", () => {
  it("allows the three known prefixes", () => {
    expect(isServableKey(`media/${HASH}.webp`)).toBe(true);
    expect(isServableKey(`files/${HASH}.pdf`)).toBe(true);
    expect(isServableKey(`generated/menu-${HASH}.pdf`)).toBe(true);
  });

  it("refuses traversal, unknown prefixes and nested paths", () => {
    // The media route joins URL segments, so this is the guard that stops a crafted
    // path reaching an object it shouldn't.
    for (const key of [
      "media/../../secret",
      "../media/x.webp",
      "secret/thing.txt",
      "media/ok.webp/../evil",
      "media//double.webp",
      "media/",
      "",
      "media/.hidden",
    ]) {
      expect(isServableKey(key), key).toBe(false);
    }
  });
});
