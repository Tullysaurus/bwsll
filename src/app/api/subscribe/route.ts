import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { subscribeSchema } from "@/lib/schemas";
import { verifyTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "We couldn't read that request." }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const { email, source, turnstileToken, website } = parsed.data;

  if (website) return NextResponse.json({ ok: true });

  const passed = await verifyTurnstile(turnstileToken, request.headers.get("cf-connecting-ip"));
  if (!passed) {
    return NextResponse.json(
      { ok: false, error: "We couldn't verify that you're human. Please reload the page and try again." },
      { status: 400 },
    );
  }

  try {
    await requireDb()
      .prepare("INSERT OR IGNORE INTO subscribers (email, source) VALUES (?1, ?2)")
      .bind(email.toLowerCase(), source ?? "footer")
      .run();
  } catch (err) {
    console.error("[subscribe] insert failed", err);
    return NextResponse.json({ ok: false, error: "We couldn't sign you up. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
