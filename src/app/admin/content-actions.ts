"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { requireDb } from "@/lib/db";
import { getBusiness, getCopy, getLegal, getOrdering } from "@/lib/content";
import { DAY_KEYS, type DayHours, type WeekHours } from "@/lib/hours";
import { mutate, recordSettingRevision, softDelete } from "@/lib/revisions";
import { saveSetting } from "@/lib/settings";
import { parseShape } from "@/lib/shape-form";

/**
 * Writes for everything the owner can edit about the business itself: hours, closures,
 * contact details, ordering links, page text and the legal pages.
 *
 * Each of these is its own POST endpoint, so each one checks permission itself. Business
 * details and the legal pages are owner-only (§ `OWNER_ONLY` in permissions.ts).
 */

async function saveContent(key: string, value: unknown, user: string, paths: string[]) {
  await saveSetting(key, value);
  await recordSettingRevision(key, value, user);
  for (const path of paths) revalidatePath(path);
  revalidatePath("/", "layout");
}

/* --- hours ---------------------------------------------------------------- */

export async function saveHours(formData: FormData) {
  const user = await requireAdmin();

  const hours = {} as WeekHours;
  for (const day of DAY_KEYS) {
    const open = String(formData.get(`${day}_open`) ?? "").trim();
    const close = String(formData.get(`${day}_close`) ?? "").trim();
    const closed = formData.get(`${day}_closed`) !== null || !open || !close;
    hours[day] = (closed ? { closed: true } : { open, close }) as DayHours;
  }

  await saveContent("hours_week", hours, user.email, ["/admin/hours", "/visit"]);
}

/* --- closures ------------------------------------------------------------- */

export async function saveClosure(formData: FormData) {
  const user = await requireAdmin();
  const database = requireDb();

  const start = String(formData.get("start_date") ?? "").trim();
  if (!start) return;
  const end = String(formData.get("end_date") ?? "").trim() || start;
  const closedAllDay = formData.get("closed") !== null;
  const open = closedAllDay ? null : String(formData.get("open_time") ?? "").trim() || null;
  const close = closedAllDay ? null : String(formData.get("close_time") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const id = Number(formData.get("id")) || null;

  if (id) {
    await mutate({
      entity: "closure",
      action: "update",
      id,
      user: user.email,
      write: database
        .prepare(
          `UPDATE closures SET start_date = ?1, end_date = ?2, closed = ?3, open_time = ?4,
           close_time = ?5, note = ?6 WHERE id = ?7`,
        )
        .bind(start, end, closedAllDay ? 1 : 0, open, close, note, id),
    });
  } else {
    await mutate({
      entity: "closure",
      action: "create",
      user: user.email,
      write: database
        .prepare(
          `INSERT INTO closures (start_date, end_date, closed, open_time, close_time, note)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
        )
        .bind(start, end, closedAllDay ? 1 : 0, open, close, note),
    });
  }

  revalidatePath("/admin/hours");
  revalidatePath("/", "layout");
}

export async function deleteClosure(formData: FormData) {
  const user = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  await softDelete("closure", id, user.email);
  revalidatePath("/admin/hours");
  revalidatePath("/", "layout");
}

/* --- business, ordering, text, legal -------------------------------------- */

export async function saveBusiness(formData: FormData) {
  const user = await requireAdmin("settings.business");
  const current = await getBusiness();
  await saveContent("business", parseShape(current, formData, "business"), user.email, ["/admin/business"]);
}

export async function saveOrdering(formData: FormData) {
  const user = await requireAdmin("settings.business");
  const current = await getOrdering();
  await saveContent("ordering", parseShape(current, formData), user.email, ["/admin/business"]);
}

export async function saveCopy(formData: FormData) {
  const user = await requireAdmin();
  const current = await getCopy();
  await saveContent("copy", parseShape(current, formData), user.email, ["/admin/text"]);
}

export async function saveLegal(formData: FormData) {
  const user = await requireAdmin("settings.legal");
  const current = await getLegal();
  await saveContent("legal", parseShape(current, formData), user.email, [
    "/admin/legal",
    "/privacy",
    "/terms",
  ]);
}
