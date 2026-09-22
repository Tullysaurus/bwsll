import "server-only";
import { env } from "./db";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifies a Turnstile token. With no `TURNSTILE_SECRET` configured (local dev before
 * keys exist) verification is skipped so forms stay testable.
 */
export async function verifyTurnstile(token: string, ip?: string | null): Promise<boolean> {
  const secret = env().TURNSTILE_SECRET;
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET not set — skipping verification");
    return true;
  }
  if (!token) return false;

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body });
    const json = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!json.success) console.warn("[turnstile] verification failed", json["error-codes"]);
    return Boolean(json.success);
  } catch (err) {
    console.error("[turnstile] verification error", err);
    return false;
  }
}

export function turnstileSiteKey(): string | undefined {
  return env().TURNSTILE_SITE_KEY;
}
