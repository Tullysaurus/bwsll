import { business } from "@/content/business";
import type { EventRecord } from "./db";
import type { HoursRow } from "./settings";
import { parseLocal } from "./format";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "7am", "7:15am", "16:00" → "07:00" (24-hour, as schema.org wants). */
function to24h(raw: string): string | null {
  const match = raw.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ?? "00";
  const period = match[3];
  if (period === "pm" && hour !== 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  if (hour > 23) return null;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

/** "Monday–Saturday" / "Mon, Wed" → schema.org day names. */
function dayNames(label: string): string[] {
  const normalise = (part: string) => {
    const clean = part.trim().toLowerCase();
    return DAYS.find((day) => day.toLowerCase().startsWith(clean.slice(0, 3))) ?? null;
  };
  const range = label.split(/[–—-]/);
  if (range.length === 2) {
    const from = normalise(range[0]);
    const to = normalise(range[1]);
    if (from && to) {
      const start = DAYS.indexOf(from);
      const end = DAYS.indexOf(to);
      const out: string[] = [];
      for (let i = start; ; i = (i + 1) % 7) {
        out.push(DAYS[i]);
        if (i === end) break;
      }
      return out;
    }
  }
  return label
    .split(/[,/]/)
    .map(normalise)
    .filter((d): d is string => Boolean(d));
}

export function openingHours(hours: HoursRow[]) {
  const spec: Record<string, unknown>[] = [];
  for (const row of hours) {
    if (/closed/i.test(row.value)) continue;
    const [openRaw, closeRaw] = row.value.split(/[–—-]/);
    const opens = openRaw ? to24h(openRaw) : null;
    const closes = closeRaw ? to24h(closeRaw) : null;
    const days = dayNames(row.label);
    if (!opens || !closes || days.length === 0) continue;
    spec.push({ "@type": "OpeningHoursSpecification", dayOfWeek: days, opens, closes });
  }
  return spec;
}

export function cafeJsonLd(hours: HoursRow[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: business.name,
    alternateName: business.shortName,
    url: siteUrl,
    telephone: `+1-918-851-1982`,
    email: business.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      addressRegion: business.address.state,
      postalCode: business.address.zip,
      addressCountry: "US",
    },
    openingHoursSpecification: openingHours(hours),
    servesCuisine: "Coffee",
    hasMenu: `${siteUrl}/menu`,
    sameAs: [business.social.instagram, business.social.facebook, business.social.tiktok, business.social.x],
    priceRange: "$",
    hasMap: business.mapUrl,
  };
}

/** Events are only published as structured data when they're open to the public. */
export function eventJsonLd(event: EventRecord, siteUrl: string) {
  const { y, m, d, hh, mm } = parseLocal(event.starts_at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startDate = `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00-05:00`;
  const endDate = event.ends_at
    ? (() => {
        const e = parseLocal(event.ends_at!);
        return `${e.y}-${pad(e.m)}-${pad(e.d)}T${pad(e.hh)}:${pad(e.mm)}:00-05:00`;
      })()
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate,
    ...(endDate ? { endDate } : {}),
    ...(event.description ? { description: event.description } : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.location,
      address: {
        "@type": "PostalAddress",
        streetAddress: business.address.street,
        addressLocality: business.address.city,
        addressRegion: business.address.state,
        postalCode: business.address.zip,
        addressCountry: "US",
      },
    },
    organizer: { "@type": "Organization", name: business.name, url: siteUrl },
  };
}
