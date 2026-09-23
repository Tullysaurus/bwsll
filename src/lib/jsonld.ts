import type { EventRecord } from "./db";
import type { Business } from "./content";
import { DAY_KEYS, DAY_SCHEMA, isClosed, type WeekHours } from "./hours";
import { parseLocal } from "./format";

/** schema.org opening hours, read straight off the structured week. */
export function openingHours(hours: WeekHours) {
  const spec: Record<string, unknown>[] = [];
  for (const key of DAY_KEYS) {
    const day = hours[key];
    if (isClosed(day)) continue;
    const existing = spec.find((row) => row.opens === day.open && row.closes === day.close);
    if (existing) {
      (existing.dayOfWeek as string[]).push(DAY_SCHEMA[key]);
      continue;
    }
    spec.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [DAY_SCHEMA[key]],
      opens: day.open,
      closes: day.close,
    });
  }
  return spec;
}

export function cafeJsonLd(business: Business, hours: WeekHours, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: business.name,
    alternateName: business.shortName,
    url: siteUrl,
    telephone: business.phoneHref.replace("tel:", ""),
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
export function eventJsonLd(business: Business, event: EventRecord, siteUrl: string) {
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
