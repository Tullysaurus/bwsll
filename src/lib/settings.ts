import "server-only";
import { cache } from "react";
import { db, requireDb } from "./db";

export type HoursRow = { label: string; value: string };
export type RentalRates = {
  business: { g10: string; g20: string; g40: string };
  after: { g10: string; g20: string; g40: string };
};

export type Settings = {
  announcement: string;
  announcement_short: string;
  closure_notice: string;
  hours: HoursRow[];
  hours_short: string;
  response_time: string;
  rental_rates: RentalRates;
};

/** Defaults are the live answer until the owner edits them in /admin/settings. */
export const defaultSettings: Settings = {
  announcement: "Now open at GEM · 609 E. Pine St., Tulsa",
  announcement_short: "Now open at GEM",
  closure_notice: "",
  hours: [
    { label: "Monday–Saturday", value: "7am–4pm" },
    { label: "Sunday", value: "Closed" },
  ],
  hours_short: "Mon–Sat · 7am–4pm",
  // TBD: owner to confirm the promised reply window.
  response_time: "2 business days",
  // TBD: owner to supply six rates. Empty strings render "Ask us".
  rental_rates: {
    business: { g10: "", g20: "", g40: "" },
    after: { g10: "", g20: "", g40: "" },
  },
};

/** One read per request, shared by the header, footer and every page. */
export const getSettings = cache(async (): Promise<Settings> => {
  const database = db();
  if (!database) return defaultSettings;
  try {
    const { results } = await database.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
    const merged: Settings = { ...defaultSettings };
    for (const row of results ?? []) {
      if (!(row.key in defaultSettings)) continue;
      try {
        (merged as Record<string, unknown>)[row.key] = JSON.parse(row.value);
      } catch {
        /* keep the default when a row holds invalid JSON */
      }
    }
    return merged;
  } catch {
    return defaultSettings;
  }
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
