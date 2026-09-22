import "server-only";
import { env } from "./db";
import { business } from "@/content/business";
import type { InquiryInput } from "./schemas";
import { money } from "./format";

const RESEND_URL = "https://api.resend.com/emails";

const LABELS: Record<string, string> = {
  organization: "Organization",
  eventDate: "Event date",
  startTime: "Start time",
  endTime: "End time",
  guests: "Guests",
  need: "What they need",
  venueAddress: "Venue address",
  startDate: "Preferred start",
  businessName: "Business name",
  businessWebsite: "Website",
  productType: "Products",
  hasLicense: "Business license",
  hasInsurance: "Proof of insurance",
  program: "Program",
  city: "City",
  school: "School",
  isUnder18: "Under 18",
  guardianName: "Parent / guardian",
  guardianEmail: "Guardian email",
  message: "Message",
};

const SKIP = new Set(["type", "turnstileToken", "website", "estimate", "name", "email", "phone"]);

function renderLines(input: InquiryInput): string[] {
  const lines = [
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    ...(input.phone ? [`Phone: ${input.phone}`] : []),
  ];
  for (const [key, value] of Object.entries(input)) {
    if (SKIP.has(key) || value === undefined || value === "") continue;
    const label = LABELS[key] ?? key;
    lines.push(`${label}: ${typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}`);
  }
  const estimate = "estimate" in input ? input.estimate : undefined;
  if (estimate) {
    lines.push("", `Catering estimate — up to ${estimate.guests} guests:`);
    for (const item of estimate.items) lines.push(`  · ${item.name} — ${money(item.price)}`);
    lines.push(`  Total: ${money(estimate.total)}`);
  }
  return lines;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Sends the owner a "new inquiry" notification. Never throws — a Resend outage must not
 * fail the visitor's submission, since the row is already safely in D1.
 */
export async function sendInquiryNotification(input: InquiryInput, id: number): Promise<void> {
  const { RESEND_API_KEY, NOTIFY_TO, NOTIFY_FROM, SITE_URL } = env();
  const to = NOTIFY_TO || business.email;
  const from = NOTIFY_FROM || `Liquid Lounge Website <website@notify.bwsll.com>`;
  const adminUrl = `${SITE_URL || "https://bwsll.com"}/admin/inquiries/${id}`;

  const subject = `New ${input.type} inquiry — ${input.name}`;
  const lines = renderLines(input);
  const text = [...lines, "", `Open in admin: ${adminUrl}`].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#1E1813">
<h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(subject)}</h2>
<p style="margin:0 0 16px;white-space:pre-wrap">${escapeHtml(lines.join("\n"))}</p>
<p style="margin:0"><a href="${adminUrl}" style="color:#24493A;font-weight:600">Open in admin →</a></p>
</div>`;

  if (!RESEND_API_KEY) {
    console.info(`[email] RESEND_API_KEY not set — would have sent to ${to}:\n${text}`);
    return;
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text, html, reply_to: input.email }),
    });
    if (!res.ok) console.error("[email] Resend rejected the message", res.status, await res.text());
  } catch (err) {
    console.error("[email] send failed", err);
  }
}
