import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Cloudflare Access verification (§8). Access itself gates the route at the edge; this
 * is defense in depth so a misconfigured DNS record can't expose /admin.
 */

export type AccessIdentity = { email: string };

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwks(teamDomain: string) {
  const url = `https://${teamDomain}/cdn-cgi/access/certs`;
  let set = jwksCache.get(url);
  if (!set) {
    set = createRemoteJWKSet(new URL(url));
    jwksCache.set(url, set);
  }
  return set;
}

export async function verifyAccessJwt(
  token: string | undefined | null,
  teamDomain: string | undefined,
  aud: string | undefined,
): Promise<AccessIdentity | null> {
  if (!token || !teamDomain || !aud) return null;
  try {
    const { payload } = await jwtVerify(token, jwks(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience: aud,
    });
    const email = typeof payload.email === "string" ? payload.email : "";
    return email ? { email } : null;
  } catch {
    return null;
  }
}

export const ACCESS_HEADER = "cf-access-jwt-assertion";
