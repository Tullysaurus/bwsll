"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { requireDb, type InquiryStatus } from "@/lib/db";
import { DEFAULT_NEW_USER_ROLE, isRole, type Role } from "@/lib/permissions";
import {
  getRevision,
  mutate,
  parseSnapshot,
  purge,
  recordSettingRevision,
  restoreSnapshot,
  softDelete,
} from "@/lib/revisions";
import { eventSchema, fieldErrors } from "@/lib/schemas";
import { saveSetting, type HoursRow, type RentalRates } from "@/lib/settings";
import { ENTITIES, type EntityType } from "@/lib/entities";

/**
 * Every exported function here is a separate POST endpoint that never renders a layout,
 * so each one calls `requireAdmin()` itself. Writes go through `mutate()` so the change
 * and its revision land atomically.
 */

const STATUSES: InquiryStatus[] = ["new", "replied", "booked", "closed"];

export async function setInquiryStatus(formData: FormData) {
  const user = await requireAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as InquiryStatus;
  if (!id || !STATUSES.includes(status)) return;

  await mutate({
    entity: "inquiry",
    action: "update",
    id,
    user: user.email,
    write: requireDb()
      .prepare("UPDATE inquiries SET status = ?1 WHERE id = ?2 AND deleted_at IS NULL")
      .bind(status, id),
  });

  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${id}`);
}

export async function saveInquiryNotes(formData: FormData) {
  const user = await requireAdmin();
  const id = Number(formData.get("id"));
  const notes = String(formData.get("notes") ?? "").slice(0, 4000);
  if (!id) return;

  await mutate({
    entity: "inquiry",
    action: "update",
    id,
    user: user.email,
    write: requireDb()
      .prepare("UPDATE inquiries SET notes = ?1 WHERE id = ?2 AND deleted_at IS NULL")
      .bind(notes, id),
  });

  revalidatePath(`/admin/inquiries/${id}`);
}

/* --- mailing list --- */

export async function addSubscriber(formData: FormData) {
  const user = await requireAdmin();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const source = String(formData.get("source") ?? "admin").slice(0, 60);
  if (!email || !z.email().safeParse(email).success) return;

  await mutate({
    entity: "subscriber",
    action: "create",
    // Upsert: the DO UPDATE branch never sets last_insert_rowid(), so name the row.
    id: email,
    user: user.email,
    write: requireDb()
      .prepare(
        `INSERT INTO subscribers (email, source) VALUES (?1, ?2)
         ON CONFLICT(email) DO UPDATE SET deleted_at = NULL, source = excluded.source`,
      )
      .bind(email, source),
  });

  revalidatePath("/admin/subscribers");
  const inquiryId = formData.get("inquiryId");
  if (inquiryId) revalidatePath(`/admin/inquiries/${inquiryId}`);
}

export async function removeSubscriber(formData: FormData) {
  const user = await requireAdmin();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return;

  await softDelete("subscriber", email, user.email);

  revalidatePath("/admin/subscribers");
  const inquiryId = formData.get("inquiryId");
  if (inquiryId) revalidatePath(`/admin/inquiries/${inquiryId}`);
}

/* --- events --- */

export type EventFormState = { errors?: Record<string, string>; message?: string };

function toStartsAt(date: string, time: string) {
  return `${date}T${time}`;
}

export async function saveEvent(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const user = await requireAdmin();
  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;

  const parsed = eventSchema.safeParse({
    title: formData.get("title") ?? "",
    date: formData.get("date") ?? "",
    startTime: formData.get("startTime") ?? "",
    endTime: formData.get("endTime") ?? "",
    location: formData.get("location") || "Liquid Lounge",
    kind: formData.get("kind") ?? "public",
    description: formData.get("description") ?? "",
    published: formData.get("published") === "on",
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Please check the highlighted fields." };
  }

  const e = parsed.data;
  const startsAt = toStartsAt(e.date, e.startTime);
  const endsAt = e.endTime ? toStartsAt(e.date, e.endTime) : null;
  const database = requireDb();

  if (id) {
    await mutate({
      entity: "event",
      action: "update",
      id,
      user: user.email,
      write: database
        .prepare(
          "UPDATE events SET title=?1, starts_at=?2, ends_at=?3, location=?4, kind=?5, description=?6, published=?7 WHERE id=?8",
        )
        .bind(e.title, startsAt, endsAt, e.location, e.kind, e.description ?? null, e.published ? 1 : 0, id),
    });
  } else {
    await mutate({
      entity: "event",
      action: "create",
      user: user.email,
      write: database
        .prepare(
          "INSERT INTO events (title, starts_at, ends_at, location, kind, description, published) VALUES (?1,?2,?3,?4,?5,?6,?7)",
        )
        .bind(e.title, startsAt, endsAt, e.location, e.kind, e.description ?? null, e.published ? 1 : 0),
    });
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  redirect("/admin/events");
}

export async function deleteEvent(formData: FormData) {
  const user = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;

  await softDelete("event", id, user.email);

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  redirect("/admin/events");
}

/* --- trash & history --- */

function assertEntity(value: unknown): Exclude<EntityType, "setting"> {
  if (typeof value === "string" && value in ENTITIES) {
    return value as Exclude<EntityType, "setting">;
  }
  throw new Error(`Unknown entity type: ${String(value)}`);
}

export async function restoreFromTrash(formData: FormData) {
  const user = await requireAdmin();
  const entity = assertEntity(formData.get("entity"));
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const def = ENTITIES[entity];
  await mutate({
    entity,
    action: "restore",
    id,
    user: user.email,
    write: requireDb()
      .prepare(`UPDATE ${def.table} SET deleted_at = NULL WHERE ${def.idColumn} = ?1`)
      .bind(def.idIsText ? id : Number(id)),
  });

  revalidatePath("/admin/trash", "layout");
  revalidatePath("/", "layout");
}

export async function purgeForever(formData: FormData) {
  await requireAdmin("trash.purge");
  const entity = assertEntity(formData.get("entity"));
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await purge(entity, id);
  revalidatePath("/admin/trash");
}

export async function restoreRevision(formData: FormData) {
  const user = await requireAdmin();
  const revisionId = Number(formData.get("revisionId"));
  if (!revisionId) return;

  const revision = await getRevision(revisionId);
  if (!revision) return;
  if (revision.entity_type === "setting") {
    const snapshot = parseSnapshot(revision) as { key?: string; value?: unknown };
    if (!snapshot.key) return;
    await saveSetting(snapshot.key, snapshot.value);
    await recordSettingRevision(snapshot.key, snapshot.value, user.email);
  } else {
    const entity = assertEntity(revision.entity_type);
    await restoreSnapshot(entity, parseSnapshot(revision), user.email);
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

/* --- team --- */

export async function addTeamMember(formData: FormData) {
  const user = await requireAdmin("team.manage");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const roleRaw = formData.get("role");
  const role: Role = isRole(roleRaw) ? roleRaw : DEFAULT_NEW_USER_ROLE;
  if (!email || !z.email().safeParse(email).success) return;

  await requireDb()
    .prepare(
      `INSERT INTO admin_users (email, role, active, added_by) VALUES (?1, ?2, 1, ?3)
       ON CONFLICT(email) DO UPDATE SET role = excluded.role, active = 1`,
    )
    .bind(email, role, user.email)
    .run();

  revalidatePath("/admin/team");
}

export async function setTeamRole(formData: FormData) {
  const user = await requireAdmin("team.manage");
  const email = String(formData.get("email") ?? "").toLowerCase();
  const roleRaw = formData.get("role");
  if (!email || !isRole(roleRaw)) return;

  // Don't let the last active owner demote themselves out of the building.
  if (email === user.email && roleRaw !== "owner" && (await activeOwnerCount()) <= 1) return;

  await requireDb().prepare("UPDATE admin_users SET role = ?1 WHERE email = ?2").bind(roleRaw, email).run();
  revalidatePath("/admin/team");
}

export async function setTeamActive(formData: FormData) {
  const user = await requireAdmin("team.manage");
  const email = String(formData.get("email") ?? "").toLowerCase();
  const active = formData.get("active") === "1";
  if (!email) return;
  if (email === user.email && !active && (await activeOwnerCount()) <= 1) return;

  await requireDb()
    .prepare("UPDATE admin_users SET active = ?1 WHERE email = ?2")
    .bind(active ? 1 : 0, email)
    .run();
  revalidatePath("/admin/team");
}

async function activeOwnerCount(): Promise<number> {
  const row = await requireDb()
    .prepare("SELECT COUNT(*) AS n FROM admin_users WHERE role = 'owner' AND active = 1")
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/* --- settings --- */

export async function saveSettings(formData: FormData) {
  const user = await requireAdmin();

  const hours: HoursRow[] = [];
  for (let i = 0; i < 8; i += 1) {
    const label = String(formData.get(`hours_label_${i}`) ?? "").trim();
    const value = String(formData.get(`hours_value_${i}`) ?? "").trim();
    if (label && value) hours.push({ label, value });
  }

  const rentalRates: RentalRates = {
    business: {
      g10: String(formData.get("rate_business_g10") ?? "").trim(),
      g20: String(formData.get("rate_business_g20") ?? "").trim(),
      g40: String(formData.get("rate_business_g40") ?? "").trim(),
    },
    after: {
      g10: String(formData.get("rate_after_g10") ?? "").trim(),
      g20: String(formData.get("rate_after_g20") ?? "").trim(),
      g40: String(formData.get("rate_after_g40") ?? "").trim(),
    },
  };

  const updates: [string, unknown][] = [
    ["hours_short", String(formData.get("hours_short") ?? "").trim()],
    ["response_time", String(formData.get("response_time") ?? "").trim()],
    ["hours", hours],
    ["rental_rates", rentalRates],
  ];

  for (const [key, value] of updates) {
    await saveSetting(key, value);
    await recordSettingRevision(key, value, user.email);
  }

  // Hours and the announcement appear in the chrome of every page.
  revalidatePath("/", "layout");
}

/**
 * The top-bar banner has its own screen, so it saves on its own — a settings save must
 * never blank a message that wasn't on the form in front of the person saving.
 */
export async function saveAnnouncement(formData: FormData) {
  const user = await requireAdmin();

  const updates: [string, string][] = [
    ["announcement", String(formData.get("announcement") ?? "").trim()],
    ["announcement_short", String(formData.get("announcement_short") ?? "").trim()],
    ["closure_notice", String(formData.get("closure_notice") ?? "").trim()],
  ];

  for (const [key, value] of updates) {
    await saveSetting(key, value);
    await recordSettingRevision(key, value, user.email);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/announcement");
}
