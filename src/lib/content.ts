import "server-only";
import { cache } from "react";
import { settingRows } from "./settings";
import { DAY_KEYS, defaultHours, type DayHours, type WeekHours } from "./hours";
import { defaultBookingRules, type BookingRules } from "./booking";
import { business as businessDefaults } from "@/content/business";
import * as copyDefaults from "@/content/copy";
import { lastUpdated, privacySections, termsSections, type LegalSection } from "@/content/legal";
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
export type Copy = {
  home: Editable<typeof copyDefaults.home>;
  club: Editable<typeof copyDefaults.club>;
  vendors: Editable<typeof copyDefaults.vendors>;
  about: Editable<typeof copyDefaults.about>;
  events: Editable<typeof copyDefaults.events>;
  privateEvents: Editable<typeof copyDefaults.privateEvents>;
  visit: Editable<typeof copyDefaults.visit>;
  menuPage: Editable<typeof copyDefaults.menuPage>;
  workforceCurriculum: Editable<typeof copyDefaults.workforceCurriculum>;
  businessDevelopment: string;
};
export type Legal = { privacy: LegalSection[]; terms: LegalSection[]; lastUpdated: string };
export type Ordering = { orderAhead: string; doordash: string; ubereats: string };

/**
 * Arrays are replaced wholesale rather than merged — a list of legal sections or
 * benefits is one thing the owner edits, not a set of positions to patch.
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

export const getBusiness = cache(async (): Promise<Business> => {
  const merged = deepMerge(businessDefaults as Business, await override("business"));

  // Derived fields are recomputed rather than edited, so a changed phone number can't
  // leave a stale `tel:` link behind.
  const phone = digits(merged.phone);
  return {
    ...merged,
    phoneHref: phone.length === 10 ? `tel:+1${phone}` : `tel:${merged.phone}`,
    emailHref: `mailto:${merged.email}`,
    addressLine: `${merged.address.street}, ${merged.address.city}, ${merged.address.state} ${merged.address.zip}`,
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

const copyBase: Copy = {
  home: copyDefaults.home as Copy["home"],
  club: copyDefaults.club as Copy["club"],
  vendors: copyDefaults.vendors as Copy["vendors"],
  about: copyDefaults.about as Copy["about"],
  events: copyDefaults.events as Copy["events"],
  privateEvents: copyDefaults.privateEvents as Copy["privateEvents"],
  visit: copyDefaults.visit as Copy["visit"],
  menuPage: copyDefaults.menuPage as Copy["menuPage"],
  workforceCurriculum: copyDefaults.workforceCurriculum as Copy["workforceCurriculum"],
  businessDevelopment: copyDefaults.businessDevelopment,
};

export const getCopy = cache(async (): Promise<Copy> => deepMerge(copyBase, await override("copy")));

export const getLegal = cache(
  async (): Promise<Legal> =>
    deepMerge({ privacy: privacySections, terms: termsSections, lastUpdated }, await override("legal")),
);

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

export const getCatering = cache(
  async (): Promise<Catering> =>
    deepMerge(
      { packages: cateringPackages, addOnNote, goodToKnow, defaultSelected, defaultTier },
      await override("catering"),
    ),
);

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
