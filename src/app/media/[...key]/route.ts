import { requireR2 } from "@/lib/db";
import { isServableKey } from "@/lib/media";

export const dynamic = "force-dynamic";

/**
 * Streams an object straight out of R2 (v2 §4.4). Keys are content-addressed, so the
 * response is immutable and can be cached forever — replacing an image produces a new
 * key, never a new version of an old one.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await params;
  const key = segments.join("/");

  // Only the known prefixes are reachable, and never a traversal.
  if (!isServableKey(key)) return new Response("Not found", { status: 404 });

  const object = await requireR2().get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  if (!headers.has("content-type")) headers.set("content-type", "application/octet-stream");

  return new Response(object.body, { headers });
}
