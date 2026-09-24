import Link from "next/link";
import { guardPage } from "../Guard";
import { MediaUploader } from "../MediaUploader";
import { listDocuments, mediaUrl, getMedia } from "@/lib/media";
import { MENU_SLUG } from "@/lib/menu-document";
import { setMenuPdfMode } from "../media-actions";
import { formatCreatedAt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const documents = await listDocuments();
  const withMedia = await Promise.all(
    documents.map(async (doc) => ({ doc, media: doc.media_id ? await getMedia(doc.media_id) : null })),
  );

  return (
    <div className="max-w-[820px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Documents
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--muted)" }}>
        The PDFs linked from the site. Uploading a new one replaces what visitors download
        — the web address stays the same, so no links break. The old file is kept.
      </p>

      <ul className="rule-top-ink mt-6 list-none">
        {withMedia.map(({ doc, media }) => (
          <li key={doc.slug} className="py-6" style={{ borderBottom: "1px solid var(--line)" }}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="display" style={{ fontSize: 22 }}>
                {doc.title}
              </h2>
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                Updated {formatCreatedAt(doc.updated_at)}
              </p>
            </div>

            <p className="mt-1 text-[14px]" style={{ color: "var(--muted)" }}>
              Linked on the site as <code>/files/{doc.slug}.pdf</code>
            </p>

            <p className="mt-2 flex flex-wrap gap-4">
              {media ? (
                <a href={mediaUrl(media.key)} target="_blank" rel="noreferrer" className="link">
                  View current
                </a>
              ) : (
                <span className="text-[15px]" style={{ color: "#8C2F20" }}>
                  No file yet — this link 404s
                </span>
              )}
              <Link href={`/files/${doc.slug}.pdf`} className="link-muted" style={{ fontSize: 15 }}>
                Open the public link
              </Link>
            </p>

            {doc.slug === MENU_SLUG ? (
              <div
                className="mt-4 rounded-[2px] p-4"
                style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
              >
                <p className="text-[15px] font-medium">Where this PDF comes from</p>
                <p className="mt-1 text-[14px]" style={{ color: "var(--muted)" }}>
                  {doc.mode === "auto"
                    ? "The site builds it from the menu you edit, so prices are never out of step. Your uploaded file is kept."
                    : "The file you uploaded. Switch to automatic and it follows the menu instead."}
                </p>
                <form action={setMenuPdfMode} className="mt-3 flex flex-wrap items-center gap-4">
                  <input type="hidden" name="slug" value={doc.slug} />
                  <input type="hidden" name="title" value={doc.title} />
                  <input type="hidden" name="mode" value={doc.mode === "auto" ? "custom" : "auto"} />
                  <button type="submit" className="btn btn-secondary">
                    {doc.mode === "auto" ? "Use my uploaded file" : "Build it from the menu"}
                  </button>
                  <Link href="/admin/menu" className="link" style={{ fontSize: 15 }}>
                    Edit the menu
                  </Link>
                </form>
              </div>
            ) : null}

            <MediaUploader
              target={{ kind: "document", slug: doc.slug, title: doc.title }}
              accept="application/pdf"
              label="Upload a new PDF"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
