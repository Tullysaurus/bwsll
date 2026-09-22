import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { sendInquiryNotification } from "@/lib/email";
import { fieldErrors, inquirySchema } from "@/lib/schemas";
import { verifyTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

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
