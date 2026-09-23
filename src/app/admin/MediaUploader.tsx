"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { attachDocumentMedia, attachSlotMedia } from "./media-actions";

/** Longest edge after resizing, per v2 §4.4. */
const MAX_EDGE = 2000;

type Target =
  | { kind: "slot"; slotId: string }
  | { kind: "document"; slug: string; title: string };

/**
 * Resizes an image in the browser before uploading, so a 12 MP phone photo becomes a
 * sensible web image instead of being rejected for size.
 *
 * Safari's `canvas.toBlob` silently ignores `image/webp` and hands back a PNG, so the
 * type that actually comes back is checked rather than assumed, falling back to JPEG.
 */
async function prepareImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return { blob: file, width: bitmap.width, height: bitmap.height };
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  const webp = await toBlob("image/webp", 0.9);
  if (webp?.type === "image/webp") return { blob: webp, width, height };

  const jpeg = await toBlob("image/jpeg", 0.85);
  if (jpeg) return { blob: jpeg, width, height };

  return { blob: file, width, height };
}

export function MediaUploader({
  target,
  accept = "image/jpeg,image/png,image/webp",
  currentAlt = "",
  label = "Upload a photo",
}: {
  target: Target;
  accept?: string;
  currentAlt?: string;
  label?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState(currentAlt);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState("");

  const isDocument = target.kind === "document";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Pick a file first.");
      setStatus("error");
      return;
    }
    if (!isDocument && !alt.trim()) {
      setError("Describe the photo first — it's read aloud to people using a screen reader.");
      setStatus("error");
      return;
    }

    setStatus("working");
    setError("");

    try {
      const body = new FormData();
      if (isDocument) {
        body.append("file", file);
      } else {
        const { blob, width, height } = await prepareImage(file);
        const extension = blob.type === "image/webp" ? "webp" : "jpg";
        body.append("file", new File([blob], `upload.${extension}`, { type: blob.type }));
        body.append("width", String(width));
        body.append("height", String(height));
        body.append("alt", alt.trim());
      }

      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const json = (await response.json()) as { ok?: boolean; error?: string; media?: { id: number } };
      if (!response.ok || !json.ok || !json.media) {
        throw new Error(json.error || "That upload didn't work.");
      }

      if (target.kind === "slot") {
        await attachSlotMedia(target.slotId, json.media.id, alt.trim() || null);
      } else {
        await attachDocumentMedia(target.slug, target.title, json.media.id);
      }

      if (inputRef.current) inputRef.current.value = "";
      setStatus("idle");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That upload didn't work.");
      setStatus("error");
    }
  }

  const uid = target.kind === "slot" ? target.slotId : target.slug;

  return (
    <form onSubmit={onSubmit} className="mt-3">
      {isDocument ? null : (
        <div className="mb-3">
          <label htmlFor={`alt-${uid}`} className="field-label">
            What&rsquo;s in the photo?
          </label>
          <input
            id={`alt-${uid}`}
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            className="field-input"
            placeholder="The green couch by the windows"
            required
          />
          <p className="field-hint">Read aloud to people using a screen reader. Required.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={`file-${uid}`} className="sr-only">
          {label}
        </label>
        <input
          id={`file-${uid}`}
          ref={inputRef}
          type="file"
          accept={accept}
          required
          className="text-[14px]"
          style={{ maxWidth: 260 }}
        />
        <button type="submit" className="btn btn-primary" disabled={status === "working"}>
          {status === "working" ? "Uploading…" : label}
        </button>
      </div>

      {isDocument ? null : (
        <p className="field-hint">
          Big photos are shrunk automatically. Credit is not permission — get written
          permission before using someone else&rsquo;s photo, and never use an identifiable
          photo of a minor without written parental consent.
        </p>
      )}

      {status === "error" ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
