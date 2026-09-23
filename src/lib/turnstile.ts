import "server-only";
import { env } from "./db";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifies a Turnstile token.
 *
 * Fails **closed** in production (v2 §3.4): a missing secret there is a misconfiguration,
 * and silently accepting every submission would turn the public forms into an open relay.
 * The skip only applies to development, so forms stay testable before keys exist.
 */
export async function verifyTurnstile(token: string, ip?: string | null): Promise<boolean> {
  const secret = env().TURNSTILE_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[turnstile] TURNSTILE_SECRET is not set in production — rejecting the submission. " +
          "Set it with `npx wrangler secret put TURNSTILE_SECRET`.",
      );
      return false;
    }
    console.warn("[turnstile] TURNSTILE_SECRET not set — skipping verification (development only)");
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
