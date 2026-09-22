import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/**
 * OpenNext snapshots whatever `.env*` files are present at build time into the deployed
 * Worker (`.open-next/cloudflare/next-env.mjs`). A stray local value would silently ship,
 * so refuse to produce a build that would carry one.
 */
if (process.env.NODE_ENV === "production") {
  const leaks: string[] = [];
  if (process.env.DEV_ADMIN === "1") {
    leaks.push("DEV_ADMIN=1 would disable the Cloudflare Access check on /admin");
  }
  if (/localhost|127\.0\.0\.1/.test(process.env.SITE_URL ?? "")) {
    leaks.push(`SITE_URL=${process.env.SITE_URL} would become the public canonical URL`);
  }
  if (leaks.length > 0) {
    throw new Error(
      `Unsafe build environment:\n  - ${leaks.join("\n  - ")}\n` +
        "These come from a .env / .env.local file. Delete them — SITE_URL belongs in " +
        "wrangler.jsonc vars (production) and .dev.vars (local). See DEPLOY.md.",
    );
  }
}

const nextConfig: NextConfig = {
  images: {
    // Avoids a paid Cloudflare Images binding — photos are exported pre-sized as WebP.
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: "/home-page", destination: "/", permanent: true },
      { source: "/workforce-development", destination: "/workforce", permanent: true },
      { source: "/workforce-development-1", destination: "/workforce", permanent: true },
    ];
  },
};

export default nextConfig;

// Gives `next dev` the real Cloudflare bindings (local D1, vars from .dev.vars).
// Wrapped because a fresh clone can run `next dev` before wrangler is configured.
try {
  initOpenNextCloudflareForDev();
} catch (error) {
  console.warn("[open-next] dev bindings unavailable:", (error as Error).message);
}
