import { NextResponse } from "next/server";
import { conflicts } from "@/lib/booking";
import { getClosures, todayLocal } from "@/lib/closures";
import { getBookingRules, getHours } from "@/lib/content";
import { db, requireDb } from "@/lib/db";
import { sendInquiryNotification } from "@/lib/email";
import { fieldErrors, inquirySchema } from "@/lib/schemas";
import { verifyTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

/** Only the room can clash; off-site catering never does. */
async function bookingConflicts(rest: Record<string, unknown>): Promise<string[]> {
  const date = typeof rest.eventDate === "string" ? rest.eventDate : "";
  const start = typeof rest.startTime === "string" ? rest.startTime : "";
  const need = typeof rest.need === "string" ? rest.need : "";
  if (!date || !start || need === "catering") return [];

  const database = db();
  if (!database) return [];

  try {
    const [rules, hours, closures] = await Promise.all([getBookingRules(), getHours(), getClosures()]);
    const { results } = await database
      .prepare(
        `SELECT starts_at, ends_at, uses_space FROM events
         WHERE deleted_at IS NULL AND uses_space = 1 AND starts_at LIKE ?1`,
      )
      .bind(`${date}%`)
      .all<{ starts_at: string; ends_at: string | null; uses_space: number }>();

    const now = `${todayLocal()}T${new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Chicago",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date())}`;

    return conflicts(
      { date, start, end: typeof rest.endTime === "string" && rest.endTime ? rest.endTime : undefined },
      { rules, hours, closures, events: results ?? [], now },
    ).map((conflict) => conflict.message);
  } catch {
    // Never block a request because the check itself failed.
    return [];
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "We couldn't read that request." }, { status: 400 });
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please check the highlighted fields and try again.",
        errors: fieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Honeypot: bots fill this in. Answer as though it worked so they stop retrying.
  if (input.website) {
    return NextResponse.json({ ok: true });
  }

  const passed = await verifyTurnstile(
    input.turnstileToken,
    request.headers.get("cf-connecting-ip"),
  );
  if (!passed) {
    return NextResponse.json(
      { ok: false, error: "We couldn't verify that you're human. Please reload the page and try again." },
      { status: 400 },
    );
  }

  // Everything type-specific is stored as JSON so the schema never has to change.
  const { name, email, phone, type, turnstileToken: _token, website: _hp, ...rest } = input;
  void _token;
  void _hp;

  // A request for the room is re-checked here, whatever the browser was shown: the page
  // may have been open for an hour. A clash doesn't refuse the request — the owner may
  // still want it, and losing the enquiry would be worse — it's recorded so the admin
  // shows it before anyone replies.
  const booking = await bookingConflicts(rest);
  if (booking.length) {
    (rest as Record<string, unknown>).conflicts = booking;
  }

  let id: number;
  try {
    const result = await requireDb()
      .prepare("INSERT INTO inquiries (type, name, email, phone, data) VALUES (?1, ?2, ?3, ?4, ?5)")
      .bind(type, name, email, phone ?? null, JSON.stringify(rest))
      .run();
    id = Number(result.meta?.last_row_id ?? 0);
  } catch (err) {
    console.error("[inquiries] insert failed", err);
    return NextResponse.json(
      { ok: false, error: "We couldn't save that. Please try again, or call us at 918-851-1982." },
      { status: 500 },
    );
  }

  // A failed notification must not fail the visitor's submission — the row is saved.
  await sendInquiryNotification(input, id);

  return NextResponse.json({ ok: true, id });
}
