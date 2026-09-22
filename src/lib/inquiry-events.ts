import type { EventKind, InquiryRecord } from "./db";
import { longDate, timeRange } from "./format";

/**
 * Turns an event/catering inquiry into sensible defaults for the admin event form, so a
 * booking the owner has agreed to can be put on the calendar without retyping it.
 */

export type InquiryEventData = {
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  organization?: string;
  need?: "rental" | "catering" | "both";
  venueAddress?: string;
  guests?: string;
  message?: string;
};

export type EventDefaults = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  kind: EventKind;
  description: string;
};

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export function parseInquiryData(inquiry: InquiryRecord): InquiryEventData {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(inquiry.data) as Record<string, unknown>;
  } catch {
    return {};
  }
  const need = str(raw.need);
  return {
    eventDate: str(raw.eventDate),
    startTime: str(raw.startTime),
    endTime: str(raw.endTime),
    organization: str(raw.organization),
    need: need === "rental" || need === "catering" || need === "both" ? need : undefined,
    venueAddress: str(raw.venueAddress),
    guests: str(raw.guests),
    message: str(raw.message),
  };
}

/** Only inquiries that name a date can seed an event. */
export function isSchedulable(inquiry: InquiryRecord): boolean {
  return Boolean(parseInquiryData(inquiry).eventDate);
}

export function eventDefaultsFromInquiry(inquiry: InquiryRecord): EventDefaults {
  const data = parseInquiryData(inquiry);

  // Off-site catering is its own kind; anything using the room is a private booking until
  // the owner decides to open it up.
  const kind: EventKind = data.need === "catering" ? "catering" : "private";
  const offSite = data.need !== "rental" && data.venueAddress;
  const location = kind === "catering" && offSite ? data.venueAddress! : "Liquid Lounge";

  const descriptionParts = [
    data.guests ? `Up to ${data.guests} guests.` : "",
    data.message ?? "",
  ].filter(Boolean);

  return {
    title: data.organization ?? inquiry.name,
    date: data.eventDate ?? "",
    startTime: data.startTime ?? "",
    endTime: data.endTime ?? "",
    location,
    kind,
    description: descriptionParts.join(" "),
  };
}

/** "Nov 14, 2026 · Test Person — 20 guests" for the picker. */
export function inquiryPickerLabel(inquiry: InquiryRecord): string {
  const data = parseInquiryData(inquiry);
  const parts = [
    data.eventDate ? longDate(data.eventDate) : "No date",
    data.organization ? `${inquiry.name} (${data.organization})` : inquiry.name,
  ];
  if (data.guests) parts.push(`${data.guests} guests`);
  return parts.join(" · ");
}

/** Short line for the "prefilled from…" banner. */
export function inquirySummary(inquiry: InquiryRecord): string {
  const data = parseInquiryData(inquiry);
  const when =
    data.eventDate && data.startTime
      ? `${longDate(data.eventDate)}, ${timeRange(`${data.eventDate}T${data.startTime}`, data.endTime ? `${data.eventDate}T${data.endTime}` : null)}`
      : data.eventDate
        ? longDate(data.eventDate)
        : "no date given";
  return `${inquiry.type} request from ${inquiry.name} — ${when}`;
}
