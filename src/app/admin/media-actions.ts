"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { deleteMedia, setDocumentMedia, setPhotoSlot, updateMediaMeta } from "@/lib/media";

/**
 * Attaching an uploaded file to a slot or a document. The upload itself goes through
 * `/api/admin/upload` (actions cap bodies at 1 MB); these only move ids around, so they
 * are safely server actions.
 */

export async function attachSlotMedia(slotId: string, mediaId: number, altOverride: string | null) {
  await requireAdmin();
  await setPhotoSlot(slotId, mediaId, altOverride?.trim() || null);
  revalidatePath("/admin/photos");
  revalidatePath("/", "layout");
}

export async function clearSlotMedia(formData: FormData) {
  await requireAdmin();
  const slotId = String(formData.get("slotId") ?? "");
  if (!slotId) return;
  await setPhotoSlot(slotId, null, null);
  revalidatePath("/admin/photos");
  revalidatePath("/", "layout");
}

export async function saveSlotDetails(formData: FormData) {
  await requireAdmin();
  const slotId = String(formData.get("slotId") ?? "");
  const mediaId = Number(formData.get("mediaId"));
  if (!slotId) return;

  await setPhotoSlot(slotId, mediaId || null, String(formData.get("alt") ?? "").trim() || null);
  if (mediaId) {
    await updateMediaMeta(mediaId, {
      creditText: String(formData.get("creditText") ?? "").trim() || null,
      creditUrl: String(formData.get("creditUrl") ?? "").trim() || null,
    });
  }
  revalidatePath("/admin/photos");
  revalidatePath("/", "layout");
}

export async function attachDocumentMedia(slug: string, title: string, mediaId: number) {
  await requireAdmin();
  await setDocumentMedia(slug, title, mediaId);
  revalidatePath("/admin/documents");
  revalidatePath("/", "layout");
}

export async function removeMedia(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("mediaId"));
  if (!id) return;
  await deleteMedia(id);
  revalidatePath("/admin/photos/library");
  revalidatePath("/admin/photos");
}
