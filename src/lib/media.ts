import "server-only";
import { db, requireDb, requireR2 } from "./db";

/**
 * Files in R2 (v2 §4.4).
 *
 * Keys are content-addressed, so uploading the same bytes twice reuses one object and a
 * replaced image never overwrites the old one — which is what makes restoring an earlier
 * version possible.
 */

export const IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
export const PDF_TYPE = "application/pdf";
export const ACCEPTED_TYPES = [...IMAGE_TYPES, PDF_TYPE] as const;

/** After browser-side resizing. PDFs are sent as-is. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  [PDF_TYPE]: "pdf",
};

export type MediaRecord = {
  id: number;
  key: string;
  content_type: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  credit_text: string | null;
  credit_url: string | null;
  uploaded_by: string | null;
  created_at: string;
  deleted_at: string | null;
};

export function isAcceptedType(value: string): value is (typeof ACCEPTED_TYPES)[number] {
  return (ACCEPTED_TYPES as readonly string[]).includes(value);
}

export function maxBytesFor(contentType: string): number {
  return contentType === PDF_TYPE ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
}

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** `media/<sha256>.webp` for images, `files/<sha256>.pdf` for documents. */
export function keyFor(hash: string, contentType: string): string {
  const prefix = contentType === PDF_TYPE ? "files" : "media";
  return `${prefix}/${hash}.${EXTENSIONS[contentType] ?? "bin"}`;
}

/** The public URL for an R2 key. D1 stores keys; URLs are derived. */
export function mediaUrl(key: string): string {
  return `/media/${key}`;
}

/** Only these prefixes are reachable through the public media route. */
export const SERVABLE_KEY = /^(media|files|generated)\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function isServableKey(key: string): boolean {
  return SERVABLE_KEY.test(key) && !key.includes("..");
}

/** Uploads bytes if the object isn't already there, then records a media row. */
export async function storeMedia(input: {
  bytes: ArrayBuffer;
  contentType: string;
  alt?: string | null;
  creditText?: string | null;
  creditUrl?: string | null;
  width?: number | null;
  height?: number | null;
  uploadedBy: string;
}): Promise<MediaRecord> {
  const bucket = requireR2();
  const hash = await sha256Hex(input.bytes);
  const key = keyFor(hash, input.contentType);

  // Content-addressed: identical bytes are already the right object.
  if (!(await bucket.head(key))) {
    await bucket.put(key, input.bytes, {
      httpMetadata: {
        contentType: input.contentType,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
  }

  const result = await requireDb()
    .prepare(
      `INSERT INTO media (key, content_type, bytes, width, height, alt, credit_text, credit_url, uploaded_by)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`,
    )
    .bind(
      key,
      input.contentType,
      input.bytes.byteLength,
      input.width ?? null,
      input.height ?? null,
      input.alt ?? null,
      input.creditText ?? null,
      input.creditUrl ?? null,
      input.uploadedBy,
    )
    .run();

  const id = Number(result.meta?.last_row_id ?? 0);
  const record = await getMedia(id);
  if (!record) throw new Error("Media row vanished immediately after insert");
  return record;
}

export async function getMedia(id: number): Promise<MediaRecord | null> {
  const database = db();
  if (!database) return null;
  return (
    (await database
      .prepare("SELECT * FROM media WHERE id = ?1 AND deleted_at IS NULL")
      .bind(id)
      .first<MediaRecord>()) ?? null
  );
}

export async function listMedia(): Promise<MediaRecord[]> {
  const database = db();
  if (!database) return [];
  const { results } = await database
    .prepare("SELECT * FROM media WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC")
    .all<MediaRecord>();
  return results ?? [];
}

/** Where each image is used, so the library can block deleting one that's in service. */
export async function mediaUsage(): Promise<Map<number, string[]>> {
  const database = db();
  const usage = new Map<number, string[]>();
  if (!database) return usage;

  const add = (id: number, where: string) => {
    const list = usage.get(id) ?? [];
    list.push(where);
    usage.set(id, list);
  };

  const slots = await database
    .prepare("SELECT slot_id, media_id FROM photo_slots WHERE media_id IS NOT NULL")
    .all<{ slot_id: string; media_id: number }>();
  for (const row of slots.results ?? []) add(row.media_id, `Photo slot: ${row.slot_id}`);

  const docs = await database
    .prepare("SELECT slug, media_id FROM documents WHERE media_id IS NOT NULL")
    .all<{ slug: string; media_id: number }>();
  for (const row of docs.results ?? []) add(row.media_id, `Document: ${row.slug}`);

  return usage;
}

export async function updateMediaMeta(
  id: number,
  fields: { alt?: string | null; creditText?: string | null; creditUrl?: string | null },
) {
  await requireDb()
    .prepare(
      `UPDATE media SET alt = COALESCE(?2, alt), credit_text = ?3, credit_url = ?4
       WHERE id = ?1 AND deleted_at IS NULL`,
    )
    .bind(id, fields.alt ?? null, fields.creditText ?? null, fields.creditUrl ?? null)
    .run();
}

/**
 * Soft-deletes the row, and removes the R2 object only when nothing else still points at
 * that key — two media rows can share one content-addressed object.
 */
export async function deleteMedia(id: number) {
  const database = requireDb();
  const record = await getMedia(id);
  if (!record) return;

  await database
    .prepare("UPDATE media SET deleted_at = datetime('now') WHERE id = ?1")
    .bind(id)
    .run();

  const others = await database
    .prepare("SELECT COUNT(*) AS n FROM media WHERE key = ?1 AND deleted_at IS NULL")
    .bind(record.key)
    .first<{ n: number }>();

  if ((others?.n ?? 0) === 0) {
    await requireR2().delete(record.key);
  }
}

/* --- photo slots --- */

export type PhotoSlotRow = { slot_id: string; media_id: number | null; alt_override: string | null };

export async function getPhotoSlotRows(): Promise<Map<string, PhotoSlotRow>> {
  const database = db();
  const map = new Map<string, PhotoSlotRow>();
  if (!database) return map;
  const { results } = await database.prepare("SELECT * FROM photo_slots").all<PhotoSlotRow>();
  for (const row of results ?? []) map.set(row.slot_id, row);
  return map;
}

export async function setPhotoSlot(slotId: string, mediaId: number | null, altOverride: string | null) {
  await requireDb()
    .prepare(
      `INSERT INTO photo_slots (slot_id, media_id, alt_override) VALUES (?1, ?2, ?3)
       ON CONFLICT(slot_id) DO UPDATE SET media_id = excluded.media_id, alt_override = excluded.alt_override`,
    )
    .bind(slotId, mediaId, altOverride)
    .run();
}

/* --- documents --- */

export type DocumentRow = {
  slug: string;
  title: string;
  media_id: number | null;
  mode: "custom" | "auto";
  updated_at: string;
};

export async function listDocuments(): Promise<DocumentRow[]> {
  const database = db();
  if (!database) return [];
  const { results } = await database.prepare("SELECT * FROM documents ORDER BY title").all<DocumentRow>();
  return results ?? [];
}

export async function getDocument(slug: string): Promise<DocumentRow | null> {
  const database = db();
  if (!database) return null;
  return (
    (await database.prepare("SELECT * FROM documents WHERE slug = ?1").bind(slug).first<DocumentRow>()) ??
    null
  );
}

export async function setDocumentMedia(slug: string, title: string, mediaId: number) {
  await requireDb()
    .prepare(
      `INSERT INTO documents (slug, title, media_id, mode, updated_at)
       VALUES (?1, ?2, ?3, 'custom', datetime('now'))
       ON CONFLICT(slug) DO UPDATE SET media_id = excluded.media_id, mode = 'custom', updated_at = datetime('now')`,
    )
    .bind(slug, title, mediaId)
    .run();
}
