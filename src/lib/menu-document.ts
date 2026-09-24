import "server-only";
import { files } from "@/content/business";
import { r2 } from "./db";
import { getBusiness, getHours, getMenu } from "./content";
import { menuPdfKey, renderMenuPdf } from "./menu-pdf";

/** The slug behind the public menu URL — the PDF link on the site never changes. */
export const MENU_SLUG = files.menu.replace(/^\/files\//, "").replace(/\.pdf$/, "");

/**
 * The generated menu, rendered on demand and kept in R2 under a key derived from the
 * menu's own contents. A menu that hasn't changed is served from the cache; changing a
 * price changes the key, so the next request renders once and every request after that
 * is a plain R2 read.
 */
export async function menuPdfBytes(): Promise<Uint8Array> {
  const [menu, business, hours] = await Promise.all([getMenu(), getBusiness(), getHours()]);
  const key = await menuPdfKey(menu, business);
  const bucket = r2();

  if (bucket) {
    try {
      const cached = await bucket.get(key);
      if (cached) return new Uint8Array(await cached.arrayBuffer());
    } catch {
      // A cache miss must never stop the download — fall through and render.
    }
  }

  const bytes = await renderMenuPdf({ menu, business, hours });

  if (bucket) {
    try {
      await bucket.put(key, bytes as unknown as ArrayBuffer, {
        httpMetadata: { contentType: "application/pdf" },
      });
    } catch {
      // Caching is an optimisation; serving the bytes is the job.
    }
  }

  return bytes;
}
