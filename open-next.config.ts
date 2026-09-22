import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = {
  ...defineCloudflareConfig(),

  /**
   * OpenNext shells out to `npm run build` by default. `npm run build` is itself
   * `opennextjs-cloudflare build` — so that Cloudflare Workers Builds works with its
   * stock settings (build `npm run build`, deploy `npx wrangler deploy`) — which would
   * recurse. Point the inner Next build at its own script instead.
   */
  buildCommand: "npm run build:next",
};

export default config;
