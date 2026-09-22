import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_HEADER, verifyAccessJwt } from "@/lib/access";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

/**
 * Cloudflare Access gates /admin at the edge; this verifies the assertion it forwards
 * so the app is still closed if the Access application is ever removed (§8).
 *
 * The local bypass is keyed off NODE_ENV, never off an env var alone: OpenNext snapshots
 * local `.env` files into the deployed Worker, so a `DEV_ADMIN=1` sitting in `.env.local`
 * would otherwise ship to production and leave /admin wide open. A production build can
 * never take this branch. Set `DEV_ADMIN=0` locally to exercise the real Access path.
 */
const DEV_BYPASS = process.env.NODE_ENV !== "production" && process.env.DEV_ADMIN !== "0";

export default async function proxy(request: NextRequest) {
  if (DEV_BYPASS) {
    const headers = new Headers(request.headers);
    headers.set("x-access-email", "dev@localhost");
    return NextResponse.next({ request: { headers } });
  }

  const token =
    request.headers.get(ACCESS_HEADER) ?? request.cookies.get("CF_Authorization")?.value ?? null;

  const identity = await verifyAccessJwt(
    token,
    process.env.CF_ACCESS_TEAM_DOMAIN,
    process.env.CF_ACCESS_AUD,
  );

  if (!identity) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const headers = new Headers(request.headers);
  headers.set("x-access-email", identity.email);
  return NextResponse.next({ request: { headers } });
}
