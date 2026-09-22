import "server-only";
import { env } from "./db";

export const DEFAULT_SITE_URL = "https://bwsll.com";

/**
 * The canonical origin, read from the Cloudflare var at request time.
 *
 * Deliberately not read from `process.env` at module scope: OpenNext bakes local `.env`
 * files into the deployed Worker, so a developer's `SITE_URL=http://localhost:…` would
 * end up in production canonicals and the sitemap. `SITE_URL` belongs in
 * `wrangler.jsonc` → `vars` (production) and `.dev.vars` (local), never in `.env*`.
 */
export function siteUrl(): string {
  const value = env().SITE_URL?.trim();
  return (value || DEFAULT_SITE_URL).replace(/\/+$/, "");
}
