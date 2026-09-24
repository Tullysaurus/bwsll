import { requireR2 } from "@/lib/db";
import { getDocument, getMedia } from "@/lib/media";
import { MENU_SLUG, menuPdfBytes } from "@/lib/menu-document";

export const dynamic = "force-dynamic";

/**
 * Serves the current version of a document by its slug, keeping the URLs the site has
 * always used (`/files/private-event-rental-agreement.pdf`) while the actual file lives
 * in R2 and can be replaced from /admin/documents.
 *
 * The menu is the one document the site can also build itself, from the menu the owner
 * edits — that's what `mode = 'auto'` means.
 *
 * The real PDFs moved out of `public/files/` in Phase 3 — anything left there would be
 * served as a static asset before the Worker ran and would shadow this route.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const slug = name.replace(/\.pdf$/i, "");
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return new Response("Not found", { status: 404 });

  const document = await getDocument(slug);

  // Built from the menu, either because that was chosen or because nothing was uploaded.
  if (slug === MENU_SLUG && (document?.mode === "auto" || !document?.media_id)) {
    const bytes = await menuPdfBytes();
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${slug}.pdf"`,
        "cache-control": "public, max-age=300, must-revalidate",
      },
    });
  }

  if (!document?.media_id) return new Response("Not found", { status: 404 });

  const media = await getMedia(document.media_id);
  if (!media) return new Response("Not found", { status: 404 });

  const object = await requireR2().get(media.key);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "content-type": media.content_type,
      // Named for the slug so a download is recognisable, and shown inline in-browser.
      "content-disposition": `inline; filename="${slug}.pdf"`,
      // The document can be replaced behind a stable URL, so this must revalidate.
      "cache-control": "public, max-age=300, must-revalidate",
      etag: object.httpEtag,
    },
  });
}
