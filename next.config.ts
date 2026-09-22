import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

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
