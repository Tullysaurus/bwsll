import "server-only";
import { cache } from "react";
import { db, requireDb } from "./db";

export type RentalRates = {
  business: { g10: string; g20: string; g40: string };
  after: { g10: string; g20: string; g40: string };
};

export type Settings = {
  announcement: string;
  announcement_short: string;
  /** A free-text override for the top bar. Dated closures live in the `closures` table. */
  closure_notice: string;
  response_time: string;
  rental_rates: RentalRates;
};

/** Defaults are the live answer until the owner edits them in /admin/settings. */
export const defaultSettings: Settings = {
  announcement: "Now open at GEM · 609 E. Pine St., Tulsa",
  announcement_short: "Now open at GEM",
  closure_notice: "",
  // TBD: owner to confirm the promised reply window.
  response_time: "2 business days",
  // TBD: owner to supply six rates. Empty strings render "Ask us".
  rental_rates: {
    business: { g10: "", g20: "", g40: "" },
    after: { g10: "", g20: "", g40: "" },
  },
};

/**
 * Every settings row, read once per request. Both this file and `content.ts` merge their
 * own defaults over it, so the whole site costs one query no matter how much is editable.
 */
export const settingRows = cache(async (): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  const database = db();
  if (!database) return map;
  try {
    const { results } = await database.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
    for (const row of results ?? []) map.set(row.key, row.value);
  } catch {
    // An un-migrated database must not take the public site down.
  }
  return map;
});

/** One read per request, shared by the header, footer and every page. */
export const getSettings = cache(async (): Promise<Settings> => {
  const merged: Settings = { ...defaultSettings };
  for (const [key, value] of await settingRows()) {
    if (!(key in defaultSettings)) continue;
    try {
      (merged as Record<string, unknown>)[key] = JSON.parse(value);
    } catch {
      /* keep the default when a row holds invalid JSON */
    }
  }
  return merged;
});

export async function saveSetting(key: keyof Settings | (string & {}), value: unknown) {
  await requireDb()
    .prepare("INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(key, JSON.stringify(value))
    .run();
}

/** "Mon–Sat · 7am–4pm" for the announcement bar; the full rows for footer/visit. */
export function rateOrAsk(rate: string): { text: string; isPlaceholder: boolean } {
  const trimmed = rate.trim();
  return trimmed ? { text: trimmed, isPlaceholder: false } : { text: "Ask us", isPlaceholder: true };
}
