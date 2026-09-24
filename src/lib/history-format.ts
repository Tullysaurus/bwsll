import { fieldsOf, humanize } from "./shape-form";
import { fieldLabel } from "./field-labels";
import { longDate, timeLabel as clockLabel } from "./format";
import { weeklyLabels, type WeekHours } from "./hours";

/**
 * Turns a revision snapshot into something readable.
 *
 * Settings values are now whole content objects — page text, legal sections, the week's
 * hours — so printing them as JSON is useless. Each one is flattened to labelled fields,
 * and a revision is shown as what *changed* against the version before it, which is both
 * shorter and the thing someone is actually looking for.
 */

export type DisplayField = { label: string; value: string };
export type FieldChange = { label: string; from: string; to: string };

/** Friendly names and the screen each setting is edited on. */
export const SETTING_LABEL: Record<string, string> = {
  announcement: "Top bar message",
  announcement_short: "Top bar message (short)",
  closure_notice: "Closed notice",
  hours_week: "Opening hours",
  rental_rates: "Room rental prices",
  response_time: "Reply time",
  business: "Business details",
  ordering: "Order ahead & delivery",
  copy: "Page text",
  legal: "Privacy & terms",
  menu: "Menu",
  booking_rules: "Booking rules",
  catering: "Catering",
};

export const SETTING_HOME: Record<string, string> = {
  announcement: "/admin/announcement",
  announcement_short: "/admin/announcement",
  closure_notice: "/admin/announcement",
  hours_week: "/admin/hours",
  rental_rates: "/admin/settings/prices",
  response_time: "/admin/settings/prices",
  business: "/admin/business",
  ordering: "/admin/business",
  copy: "/admin/text",
  legal: "/admin/legal",
  menu: "/admin/menu",
  booking_rules: "/admin/hours",
  catering: "/admin/catering",
};

export const EMPTY = "— empty —";

/**
 * "home.hero.h1a" → "Home › Hero › Heading — first line". The last segment gets the
 * same plain-language name the editor shows; array indexes read as "#2".
 */
export function pathLabel(path: string): string {
  const parts = path.split(".");
  return parts
    .map((segment, index) => {
      if (/^\d+$/.test(segment)) return `#${Number(segment) + 1}`;
      return index === parts.length - 1 ? fieldLabel(segment) : humanize(segment);
    })
    .join(" › ");
}

function isWeekHours(value: unknown): value is WeekHours {
  return Boolean(value && typeof value === "object" && "mon" in (value as object) && "sun" in (value as object));
}

/** A settings value as labelled fields, whatever shape it happens to be. */
export function settingFields(key: string, value: unknown): DisplayField[] {
  if (value === null || value === undefined) return [];

  // Hours read best the way the site words them.
  if (key === "hours_week" && isWeekHours(value)) {
    return weeklyLabels(value).map((row) => ({ label: row.label, value: row.value }));
  }

  if (typeof value === "string") {
    return [{ label: SETTING_LABEL[key] ?? humanize(key), value: value.trim() || EMPTY }];
  }

  return fieldsOf(value).map((field) => ({
    label: pathLabel(field.path),
    value:
      field.kind === "lines"
        ? field.value.join(" · ") || EMPTY
        : field.value.trim() || EMPTY,
  }));
}

/** Fields present in `next` that differ from `previous`, plus ones that disappeared. */
export function changedFields(previous: DisplayField[], next: DisplayField[]): FieldChange[] {
  const before = new Map(previous.map((field) => [field.label, field.value]));
  const after = new Map(next.map((field) => [field.label, field.value]));

  const changes: FieldChange[] = [];
  for (const [label, value] of after) {
    const old = before.get(label);
    if (old !== value) changes.push({ label, from: old ?? EMPTY, to: value });
  }
  for (const [label, value] of before) {
    if (!after.has(label)) changes.push({ label, from: value, to: EMPTY });
  }
  return changes;
}

/** Record fields (events, inquiries, subscribers) in plain language. */
export function recordField(field: string, raw: unknown): DisplayField {
  const label = humanize(field.replace(/_/g, " "));

  if (field === "published") return { label, value: raw ? "Shown on the site" : "Hidden" };
  if (field === "closed") return { label, value: raw ? "Closed all day" : "Special hours" };

  const value = typeof raw === "object" ? JSON.stringify(raw) : String(raw ?? "");

  // Local ISO timestamps ("2026-09-26T18:00") and plain dates read as dates.
  const stamp = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?$/.exec(value);
  if (stamp) {
    return {
      label,
      value: stamp[2] ? `${longDate(value)}, ${clockLabel(value)}` : longDate(`${stamp[1]}T00:00`),
    };
  }

  return { label, value: value.trim() || EMPTY };
}
