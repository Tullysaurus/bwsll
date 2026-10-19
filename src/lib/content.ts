import "server-only";
import { cache } from "react";
import { settingRows } from "./settings";
import { DAY_KEYS, defaultHours, type DayHours, type WeekHours } from "./hours";
import { defaultBookingRules, type BookingRules } from "./booking";
import { business as businessDefaults } from "@/content/business";
import { menuDocument, type MenuDocument } from "@/content/menu";
import {
  addOnNote,
  cateringPackages,
  defaultSelected,
  defaultTier,
  goodToKnow,
  type CateringPackage,
  type GuestTier,
} from "@/content/catering";

/**
 * Owner-editable content.
 *
 * Every getter follows the same rule: the constant in `src/content/*` is the default,
 * a JSON row in `settings` overrides it, and the two are merged key by key. A key added
 * to the code later shows up immediately with no migration, and an empty database still
 * renders the whole site.
 *
 * Only what the admin edits is read from the row. Page wording and the legal pages are
 * imported straight from `src/content/*`, and so are the business and catering fields
 * the admin locks — so a value saved before they were locked can't linger on the site.
 */

/** Widens `as const` content into the editable shape: literals become strings. */
type Editable<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? Editable<U>[]
        : T extends object
          ? { -readonly [K in keyof T]: Editable<T[K]> }
          : T;

export type Business = Editable<typeof businessDefaults>;
export type Ordering = { orderAhead: string; doordash: string; ubereats: string };

/**
 * Arrays are replaced wholesale rather than merged — a list of drinks or packages is one
 * thing the owner edits, not a set of positions to patch.
 */
export function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === null || patch === undefined) return base;
  if (Array.isArray(base)) return (Array.isArray(patch) ? patch : base) as T;
  if (typeof base === "object" && base !== null && typeof patch === "object" && !Array.isArray(patch)) {
    const out = { ...(base as Record<string, unknown>) };
    for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
      if (key in out) out[key] = deepMerge(out[key], value);
    }
    return out as T;
  }
  return (typeof patch === typeof base ? (patch as T) : base);
}

async function override(key: string): Promise<unknown> {
  const raw = (await settingRows()).get(key);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

const digits = (value: string) => value.replace(/\D/g, "");

/** "https://www.instagram.com/BWStLiquidLounge/" → "@BWStLiquidLounge". */
function handleOf(url: string): string | null {
  const name = url.replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop() ?? "";
  return name && !name.includes(".") ? `@${name}` : null;
}

/** The business fields the admin edits. Everything else about the business is code. */
export type Contact = Pick<Business, "phone" | "email" | "social"> & {
  address: Pick<Business["address"], "street" | "city" | "state" | "zip">;
};

export function contactOf(info: Business): Contact {
  const { street, city, state, zip } = info.address;
  return { phone: info.phone, email: info.email, address: { street, city, state, zip }, social: info.social };
}

export const getBusiness = cache(async (): Promise<Business> => {
  const defaults = businessDefaults as Business;
  // Merging over the contact fields alone drops anything else an older save stored.
  const contact = deepMerge(contactOf(defaults), await override("business"));
  const merged: Business = { ...defaults, ...contact, address: { ...defaults.address, ...contact.address } };

  // Derived fields are recomputed rather than edited, so a changed phone number can't
  // leave a stale `tel:` link behind, nor a changed Instagram link a stale handle.
  const phone = digits(merged.phone);
  return {
    ...merged,
    phoneHref: phone.length === 10 ? `tel:+1${phone}` : `tel:${merged.phone}`,
    emailHref: `mailto:${merged.email}`,
    addressLine: `${merged.address.street}, ${merged.address.city}, ${merged.address.state} ${merged.address.zip}`,
    instagramHandle: handleOf(merged.social.instagram) ?? defaults.instagramHandle,
  };
});

export function socialLinksOf(info: Business) {
  return [
    { label: "Instagram", href: info.social.instagram },
    { label: "Facebook", href: info.social.facebook },
    { label: "TikTok", href: info.social.tiktok },
    { label: "X", href: info.social.x },
  ].filter((link) => link.href.trim());
}

/** The whole menu. Lists are replaced wholesale, so removing an item really removes it. */
export const getMenu = cache(
  async (): Promise<MenuDocument> => deepMerge(menuDocument, await override("menu")),
);

/** When the room can be booked, and the rules a request has to satisfy. */
export const getBookingRules = cache(
  async (): Promise<BookingRules> => deepMerge(defaultBookingRules, await override("booking_rules")),
);

export type Catering = {
  packages: CateringPackage[];
  addOnNote: string;
  goodToKnow: string[];
  defaultSelected: string[];
  defaultTier: GuestTier;
};

/** Only the packages are edited; the add-ons note and the house rules are code. */
export const getCatering = cache(async (): Promise<Catering> => {
  const saved = deepMerge({ packages: cateringPackages, defaultSelected, defaultTier }, await override("catering"));
  return { ...saved, addOnNote, goodToKnow };
});

export const getOrdering = cache(
  async (): Promise<Ordering> =>
    deepMerge({ orderAhead: "", doordash: "", ubereats: "" }, await override("ordering")),
);

/**
 * Hours are merged day by day rather than key by key: a day is a union — either
 * `{ closed: true }` or `{ open, close }` — so patching one field of the other shape
 * would silently leave a closed day open.
 */
export const getHours = cache(async (): Promise<WeekHours> => {
  const patch = await override("hours_week");
  const hours: WeekHours = { ...defaultHours };
  if (!patch || typeof patch !== "object") return hours;

  for (const day of DAY_KEYS) {
    const value = (patch as Record<string, unknown>)[day];
    if (!value || typeof value !== "object") continue;
    const row = value as { closed?: boolean; open?: string; close?: string };
    hours[day] = (row.closed || !row.open || !row.close
      ? { closed: true }
      : { open: row.open, close: row.close }) as DayHours;
  }
  return hours;
});
