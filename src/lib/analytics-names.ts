/**
 * The event names, shared by the browser and the server.
 *
 * `analytics.ts` is `server-only` because it talks to D1; the names themselves have to
 * be importable from a client component, so they live here and it re-exports them.
 */

export const TRACKED = [
  "order_ahead",
  "delivery",
  "menu_pdf",
  "directions",
  "call",
  "email",
  "inquiry_sent",
  "newsletter_signup",
] as const;

export type TrackedEvent = (typeof TRACKED)[number];

export const EVENT_LABEL: Record<TrackedEvent, string> = {
  order_ahead: "Order ahead",
  delivery: "Delivery app opened",
  menu_pdf: "Menu PDF opened",
  directions: "Directions opened",
  call: "Phone number tapped",
  email: "Email address tapped",
  inquiry_sent: "Request sent",
  newsletter_signup: "Joined the mailing list",
};

export function isTracked(value: string): value is TrackedEvent {
  return (TRACKED as readonly string[]).includes(value);
}
