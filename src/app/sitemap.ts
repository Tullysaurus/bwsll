import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Rendered per request so the host comes from the runtime SITE_URL var, not a build-time
// `.env` value that OpenNext would bake into the Worker.
export const dynamic = "force-dynamic";

const routes = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/menu", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/events", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/private-events", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/club", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/workforce", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/vendors", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/visit", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.6, changeFrequency: "yearly" as const },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();
  return routes.map((route) => ({
    url: `${base}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
