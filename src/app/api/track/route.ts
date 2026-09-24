import { cleanPath, isTracked, recordEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Counts one action. Public — it sits outside the proxy matcher, so anyone can post to
 * it — which is why the guards are the point:
 *
 * - the name must be one of the allowlisted events, or it's dropped;
 * - the path is capped and stripped of its query string;
 * - nothing else is read. Not the IP, not the user agent, not the body beyond those two
 *   fields, so there is nothing here to tie a row to a person.
 *
 * It always answers 204, so a blocked or malformed beacon never shows the visitor an
 * error, and a bot gets no signal about what was accepted.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown; path?: unknown };
    const name = typeof body.name === "string" ? body.name : "";
    const path = typeof body.path === "string" ? body.path : "/";

    if (isTracked(name)) await recordEvent(name, cleanPath(path));
  } catch {
    // Malformed body: nothing to count, nothing to say.
  }

  return new Response(null, { status: 204 });
}
