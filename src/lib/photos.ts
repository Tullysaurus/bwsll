import "server-only";
import { cache } from "react";
import { db } from "./db";
import { mediaUrl } from "./media";
import { photo, type PhotoCredit, type PhotoTone } from "@/content/photos";

/**
 * Merges the slot definitions in `src/content/photos.ts` (tone, label, default alt —
 * things the layout depends on) with the D1 override that says which uploaded image is
 * currently in the slot. Code is the default; the database only ever adds a photo.
 *
 * One query per request serves every slot on the page.
 */

export type ResolvedPhotoSlot = {
  id: string;
  /** The media row currently in this slot, for the admin screen. */
  mediaId?: number;
  src?: string;
  alt: string;
  label: string;
  tone: PhotoTone;
  credit?: PhotoCredit;
  width?: number;
  height?: number;
};

type SlotJoin = {
  slot_id: string;
  alt_override: string | null;
  media_id: number | null;
  key: string | null;
  alt: string | null;
  credit_text: string | null;
  credit_url: string | null;
  width: number | null;
  height: number | null;
};

const overrides = cache(async (): Promise<Map<string, SlotJoin>> => {
  const database = db();
  const map = new Map<string, SlotJoin>();
  if (!database) return map;

  try {
    const { results } = await database
      .prepare(
        `SELECT s.slot_id, s.alt_override, m.id AS media_id, m.key, m.alt, m.credit_text, m.credit_url, m.width, m.height
         FROM photo_slots s
         LEFT JOIN media m ON m.id = s.media_id AND m.deleted_at IS NULL`,
      )
      .all<SlotJoin>();
    for (const row of results ?? []) map.set(row.slot_id, row);
  } catch {
    // An un-migrated database must not take the public site down.
  }
  return map;
});

export async function getPhotoSlot(id: string): Promise<ResolvedPhotoSlot> {
  const base = photo(id);
  const row = (await overrides()).get(id);

  if (!row?.key) {
    return { id, alt: base.alt, label: base.label, tone: base.tone, credit: base.credit };
  }

  return {
    id,
    mediaId: row.media_id ?? undefined,
    src: mediaUrl(row.key),
    alt: row.alt_override?.trim() || row.alt?.trim() || base.alt,
    label: base.label,
    tone: base.tone,
    credit: row.credit_text
      ? { text: row.credit_text, url: row.credit_url ?? undefined }
      : base.credit,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
  };
}

/** Every slot, in the order they're declared in code — for the admin screen. */
export async function getAllPhotoSlots(ids: string[]): Promise<ResolvedPhotoSlot[]> {
  await overrides();
  return Promise.all(ids.map((id) => getPhotoSlot(id)));
}
