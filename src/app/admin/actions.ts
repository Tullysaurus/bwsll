"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db, requireDb, type InquiryStatus } from "@/lib/db";
import { conflicts } from "@/lib/booking";
import { getClosures, todayLocal } from "@/lib/closures";
import { getBookingRules, getHours } from "@/lib/content";
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
import { saveSetting, type RentalRates } from "@/lib/settings";
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

export type EventFormState = {
  errors?: Record<string, string>;
  message?: string;
  /** Reasons the room isn't free — shown with a "save anyway" button, never a refusal. */
  conflicts?: string[];
};

/**
 * Everything already in the room at that time, excluding the event being edited. Same
 * `conflicts()` the public calendar and the inquiry re-check use, so the three agree.
 */
async function eventConflicts(input: {
  id: number | null;
  date: string;
  start: string;
  end?: string;
}): Promise<string[]> {
  const database = db();
  if (!database) return [];

  try {
    const [rules, hours, closures] = await Promise.all([getBookingRules(), getHours(), getClosures()]);
    const { results } = await database
      .prepare(
        `SELECT id, starts_at, ends_at, uses_space FROM events
         WHERE deleted_at IS NULL AND uses_space = 1 AND starts_at LIKE ?1`,
      )
      .bind(`${input.date}%`)
      .all<{ id: number; starts_at: string; ends_at: string | null; uses_space: number }>();

    return conflicts(
      { date: input.date, start: input.start, end: input.end || undefined },
      {
        rules,
        hours,
        closures,
        events: (results ?? []).filter((row) => row.id !== input.id),
        now: `${todayLocal()}T00:00`,
      },
    )
      // Staff put things in the diary at short notice and far ahead; those two rules are
      // for the public form, not for the calendar.
      .filter((conflict) => conflict.code !== "notice" && conflict.code !== "horizon")
      .map((conflict) => conflict.message);
  } catch {
    return [];
  }
}

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
    usesSpace: formData.get("usesSpace") === "on",
    hideTitle: formData.get("hideTitle") === "on",
    inquiryId: formData.get("inquiryId") || undefined,
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Please check the highlighted fields." };
  }

  const e = parsed.data;
  const startsAt = toStartsAt(e.date, e.startTime);
  const endsAt = e.endTime ? toStartsAt(e.date, e.endTime) : null;
  const database = requireDb();

  // An event that occupies the room is checked against everything else in it. This is a
  // warning, not a rule: staff know things the calendar doesn't, so "Save anyway"
  // carries `force` and goes straight through.
  if (e.usesSpace && formData.get("force") !== "1") {
    const clashes = await eventConflicts({ id, date: e.date, start: e.startTime, end: e.endTime });
    if (clashes.length) {
      return {
        conflicts: clashes,
        message: "That time isn't free.",
      };
    }
  }

  if (id) {
    await mutate({
      entity: "event",
      action: "update",
      id,
      user: user.email,
      write: database
        .prepare(
          `UPDATE events SET title=?1, starts_at=?2, ends_at=?3, location=?4, kind=?5, description=?6,
           published=?7, uses_space=?8, hide_title=?9 WHERE id=?10`,
        )
        .bind(
          e.title,
          startsAt,
          endsAt,
          e.location,
          e.kind,
          e.description ?? null,
          e.published ? 1 : 0,
          e.usesSpace ? 1 : 0,
          e.hideTitle ? 1 : 0,
          id,
        ),
    });
  } else {
    await mutate({
      entity: "event",
      action: "create",
      user: user.email,
      write: database
        .prepare(
          `INSERT INTO events (title, starts_at, ends_at, location, kind, description, published,
           uses_space, hide_title, inquiry_id) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)`,
        )
        .bind(
          e.title,
          startsAt,
          endsAt,
          e.location,
          e.kind,
          e.description ?? null,
          e.published ? 1 : 0,
          e.usesSpace ? 1 : 0,
          e.hideTitle ? 1 : 0,
          e.inquiryId ?? null,
        ),
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
    ["response_time", String(formData.get("response_time") ?? "").trim()],
    ["rental_rates", rentalRates],
  ];

  for (const [key, value] of updates) {
    await saveSetting(key, value);
    await recordSettingRevision(key, value, user.email);
  }

  // Rates and the reply promise appear in the chrome of every page.
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
