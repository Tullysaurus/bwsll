"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { requireDb } from "@/lib/db";
import { getBookingRules, getBusiness, getCatering, getCopy, getLegal, getMenu, getOrdering } from "@/lib/content";
import { DAY_KEYS, type DayHours, type WeekHours } from "@/lib/hours";
import { parseWindows, type BookingRules } from "@/lib/booking";
import { parsePackages } from "@/lib/catering-text";
import { mutate, recordSettingRevision, softDelete } from "@/lib/revisions";
import { saveSetting } from "@/lib/settings";
import { parseShape } from "@/lib/shape-form";
import {
  parseDrinks,
  parseSimpleItems,
  parseSizedItems,
  type Parsed,
  type ParseIssue,
} from "@/lib/menu-text";
import type { MenuDocument } from "@/content/menu";

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

/* --- menu ----------------------------------------------------------------- */

export async function saveMenu(formData: FormData) {
  const user = await requireAdmin();
  const current = await getMenu();
  const text = (name: string) => String(formData.get(name) ?? "");

  const issues: ParseIssue[] = [];
  const collect = <T,>(parsed: Parsed<T>, where: string): T => {
    for (const issue of parsed.issues) issues.push({ ...issue, message: `${where}, line ${issue.line}: ${issue.message}` });
    return parsed.value;
  };

  const menu: MenuDocument = {
    ...current,
    sizedTables: current.sizedTables.map((table, index) => ({
      ...table,
      title: text(`table_${index}_title`).trim() || table.title,
      sizes: [
        text(`table_${index}_size0`).trim() || table.sizes[0],
        text(`table_${index}_size1`).trim() || table.sizes[1],
      ],
      items: collect(parseSizedItems(text(`table_${index}_items`), table.title), table.title),
    })),
    signatureGroups: current.signatureGroups.map((group, index) => ({
      ...group,
      group: text(`sig_${index}_name`).trim() || group.group,
      prices: [
        { size: text(`sig_${index}_size0`).trim(), price: text(`sig_${index}_price0`).trim() },
        { size: text(`sig_${index}_size1`).trim(), price: text(`sig_${index}_price1`).trim() },
      ],
      drinks: collect(parseDrinks(text(`sig_${index}_drinks`)), group.group),
    })),
    espresso: collect(parseSimpleItems(text("espresso")), "Espresso"),
    food: collect(parseSimpleItems(text("food")), "Food"),
    flavorShots: {
      price: text("flavor_price").trim(),
      groups: current.flavorShots.groups.map((group, index) => ({
        label: text(`flavor_${index}_label`).trim() || group.label,
        items: text(`flavor_${index}_items`).trim(),
      })),
    },
  };

  // A line that can't be read would silently disappear from the menu, so nothing is
  // saved until every line parses.
  if (issues.length) {
    throw new Error(
      `Nothing was saved. ${issues.length === 1 ? "One line" : `${issues.length} lines`} couldn't be read — ${issues
        .slice(0, 3)
        .map((issue) => issue.message)
        .join("; ")}${issues.length > 3 ? "; …" : ""}`,
    );
  }

  await saveContent("menu", menu, user.email, ["/admin/menu", "/menu"]);
}

/* --- booking rules and catering -------------------------------------------- */

export async function saveBookingRules(formData: FormData) {
  const user = await requireAdmin();
  const current = await getBookingRules();

  const number = (name: string, fallback: number) => {
    const value = Number(String(formData.get(name) ?? "").trim());
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };

  const windows = { ...current.windows };
  for (const day of DAY_KEYS) {
    windows[day] = parseWindows(String(formData.get(`book_${day}`) ?? ""));
  }

  const rules: BookingRules = {
    windows,
    bufferMinutes: number("bufferMinutes", current.bufferMinutes),
    minMinutes: number("minMinutes", current.minMinutes),
    maxMinutes: number("maxMinutes", current.maxMinutes),
    noticeHours: number("noticeHours", current.noticeHours),
    horizonDays: number("horizonDays", current.horizonDays),
  };

  await saveContent("booking_rules", rules, user.email, ["/admin/hours", "/private-events"]);
}

export async function saveCatering(formData: FormData) {
  const user = await requireAdmin();
  const current = await getCatering();

  const { value: packages, issues } = parsePackages(String(formData.get("packages") ?? ""));
  if (issues.length) {
    throw new Error(
      `Nothing was saved. ${issues.map((issue) => `Line ${issue.line}: ${issue.message}`).join(" ")}`,
    );
  }

  const lines = (name: string) =>
    String(formData.get(name) ?? "")
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  // A package that's gone can't stay ticked by default.
  const ids = new Set(packages.map((pkg) => pkg.id));

  await saveContent(
    "catering",
    {
      ...current,
      packages,
      addOnNote: String(formData.get("addOnNote") ?? "").trim(),
      goodToKnow: lines("goodToKnow"),
      defaultSelected: current.defaultSelected.filter((id) => ids.has(id)),
    },
    user.email,
    ["/admin/catering", "/private-events"],
  );
}
