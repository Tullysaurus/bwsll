import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_HEADER, verifyAccessJwt } from "@/lib/access";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

/**
 * Cloudflare Access gates /admin at the edge; this verifies the assertion it forwards
 * so the app is still closed if the Access application is ever removed (§8).
 * `DEV_ADMIN=1` bypasses the check for local development only.
 */
export default async function proxy(request: NextRequest) {
  if (process.env.DEV_ADMIN === "1") {
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
