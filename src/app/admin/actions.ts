"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDb, type InquiryStatus } from "@/lib/db";
import { z } from "zod";
import { eventSchema, fieldErrors } from "@/lib/schemas";
import { saveSetting, type HoursRow, type RentalRates } from "@/lib/settings";

const STATUSES: InquiryStatus[] = ["new", "replied", "booked", "closed"];

export async function setInquiryStatus(formData: FormData) {
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as InquiryStatus;
  if (!id || !STATUSES.includes(status)) return;

  await requireDb().prepare("UPDATE inquiries SET status = ?1 WHERE id = ?2").bind(status, id).run();
  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${id}`);
}

export async function saveInquiryNotes(formData: FormData) {
  const id = Number(formData.get("id"));
  const notes = String(formData.get("notes") ?? "").slice(0, 4000);
  if (!id) return;

  await requireDb().prepare("UPDATE inquiries SET notes = ?1 WHERE id = ?2").bind(notes, id).run();
  revalidatePath(`/admin/inquiries/${id}`);
}

/** Mailing list — the owner can add or remove an address by hand from either screen. */
export async function addSubscriber(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const source = String(formData.get("source") ?? "admin").slice(0, 60);
  if (!email || !z.email().safeParse(email).success) return;

  await requireDb()
    .prepare("INSERT OR IGNORE INTO subscribers (email, source) VALUES (?1, ?2)")
    .bind(email, source)
    .run();

  revalidatePath("/admin/subscribers");
  const inquiryId = formData.get("inquiryId");
  if (inquiryId) revalidatePath(`/admin/inquiries/${inquiryId}`);
}

export async function removeSubscriber(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return;

  await requireDb().prepare("DELETE FROM subscribers WHERE email = ?1").bind(email).run();

  revalidatePath("/admin/subscribers");
  const inquiryId = formData.get("inquiryId");
  if (inquiryId) revalidatePath(`/admin/inquiries/${inquiryId}`);
}

export type EventFormState = { errors?: Record<string, string>; message?: string };

function toStartsAt(date: string, time: string) {
  return `${date}T${time}`;
}

export async function saveEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
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
  const db = requireDb();

  if (id) {
    await db
      .prepare(
        "UPDATE events SET title=?1, starts_at=?2, ends_at=?3, location=?4, kind=?5, description=?6, published=?7 WHERE id=?8",
      )
      .bind(e.title, startsAt, endsAt, e.location, e.kind, e.description ?? null, e.published ? 1 : 0, id)
      .run();
  } else {
    await db
      .prepare(
        "INSERT INTO events (title, starts_at, ends_at, location, kind, description, published) VALUES (?1,?2,?3,?4,?5,?6,?7)",
      )
      .bind(e.title, startsAt, endsAt, e.location, e.kind, e.description ?? null, e.published ? 1 : 0)
      .run();
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  redirect("/admin/events");
}

export async function deleteEvent(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await requireDb().prepare("DELETE FROM events WHERE id = ?1").bind(id).run();
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  redirect("/admin/events");
}

export async function saveSettings(formData: FormData) {
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

  await Promise.all([
    saveSetting("announcement", String(formData.get("announcement") ?? "").trim()),
    saveSetting("announcement_short", String(formData.get("announcement_short") ?? "").trim()),
    saveSetting("closure_notice", String(formData.get("closure_notice") ?? "").trim()),
    saveSetting("hours_short", String(formData.get("hours_short") ?? "").trim()),
    saveSetting("response_time", String(formData.get("response_time") ?? "").trim()),
    saveSetting("hours", hours),
    saveSetting("rental_rates", rentalRates),
  ]);

  // Hours and the announcement appear in the chrome of every page.
  revalidatePath("/", "layout");
}
