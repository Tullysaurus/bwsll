"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { requireDb } from "@/lib/db";
import { CLUB_STATUSES } from "@/lib/club";
import { mutate, softDelete } from "@/lib/revisions";
import { todayLocal } from "@/lib/closures";
import { addMonths } from "@/lib/club";

/**
 * Club members. Every write goes through `mutate()`, so a member has the same history
 * and the same undo as an event — a membership is someone's money.
 */

function fields(formData: FormData) {
  const status = String(formData.get("status") ?? "pending");
  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    status: (CLUB_STATUSES as string[]).includes(status) ? status : "pending",
    startDate: String(formData.get("start_date") ?? "").trim() || null,
    endDate: String(formData.get("end_date") ?? "").trim() || null,
    payLink: String(formData.get("pay_link") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createClubMember(formData: FormData) {
  const user = await requireAdmin();
  const f = fields(formData);
  if (!f.name || !f.email) return;

  const inquiryId = Number(formData.get("inquiry_id")) || null;
  // Membership is sold by the year, so an end date one year out is the sensible default
  // for a start date that was given. It can be edited straight afterwards.
  const endDate = f.endDate ?? (f.startDate ? addMonths(f.startDate, 12) : null);

  const id = await mutate({
    entity: "club_member",
    action: "create",
    user: user.email,
    write: requireDb()
      .prepare(
        `INSERT INTO club_members (name, email, phone, status, start_date, end_date, pay_link, notes, inquiry_id)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`,
      )
      .bind(
        f.name,
        f.email,
        f.phone,
        f.status,
        f.startDate,
        endDate,
        f.payLink,
        f.notes,
        inquiryId,
      ),
  });

  revalidatePath("/admin/club");
  redirect(`/admin/club/${id}`);
}

export async function saveClubMember(formData: FormData) {
  const user = await requireAdmin();
  const id = Number(formData.get("id"));
  const f = fields(formData);
  if (!id || !f.name || !f.email) return;

  await mutate({
    entity: "club_member",
    action: "update",
    id,
    user: user.email,
    write: requireDb()
      .prepare(
        `UPDATE club_members SET name=?1, email=?2, phone=?3, status=?4, start_date=?5,
         end_date=?6, pay_link=?7, notes=?8 WHERE id=?9`,
      )
      .bind(f.name, f.email, f.phone, f.status, f.startDate, f.endDate, f.payLink, f.notes, id),
  });

  revalidatePath("/admin/club");
  revalidatePath(`/admin/club/${id}`);
}

export async function deleteClubMember(formData: FormData) {
  const user = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;

  await softDelete("club_member", id, user.email);
  revalidatePath("/admin/club");
  redirect("/admin/club");
}

/** Marks memberships that ran past their end date, so the list tells the truth. */
export async function expireLapsedMembers() {
  const user = await requireAdmin();
  const today = todayLocal();

  const { results } = await requireDb()
    .prepare(
      "SELECT id FROM club_members WHERE deleted_at IS NULL AND status = 'active' AND end_date IS NOT NULL AND end_date < ?1",
    )
    .bind(today)
    .all<{ id: number }>();

  for (const row of results ?? []) {
    await mutate({
      entity: "club_member",
      action: "update",
      id: row.id,
      user: user.email,
      write: requireDb().prepare("UPDATE club_members SET status = 'expired' WHERE id = ?1").bind(row.id),
    });
  }

  revalidatePath("/admin/club");
}
