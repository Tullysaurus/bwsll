import Link from "next/link";
import { guardPage } from "../../Guard";
import { ConfirmButton } from "../../ConfirmButton";
import { removeMedia } from "../../media-actions";
import { listMedia, mediaUrl, mediaUsage, PDF_TYPE } from "@/lib/media";
import { formatCreatedAt } from "@/lib/format";

export const dynamic = "force-dynamic";

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default async function LibraryPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const [media, usage] = await Promise.all([listMedia(), mediaUsage()]);
  const images = media.filter((item) => item.content_type !== PDF_TYPE);
  const files = media.filter((item) => item.content_type === PDF_TYPE);

  return (
    <div className="max-w-[900px]">
      <Link href="/admin/photos" className="link">
        ← Photos
      </Link>
      <h1 className="display mt-4" style={{ fontSize: 32 }}>
        Photo library
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--muted)" }}>
        Everything uploaded to the site. A photo that&rsquo;s in use can&rsquo;t be deleted —
        take it out of its spot first.
      </p>

      <section className="mt-8">
        <h2 className="display" style={{ fontSize: 22 }}>
          Photos ({images.length})
        </h2>
        {images.length === 0 ? (
          <p className="mt-3 text-[16px]" style={{ color: "var(--muted)" }}>
            Nothing uploaded yet.
          </p>
        ) : (
          <ul className="mt-4 grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((item) => {
              const used = usage.get(item.id) ?? [];
              return (
                <li key={item.id} style={{ border: "1px solid var(--line)", borderRadius: 2 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(item.key)}
                    alt={item.alt ?? ""}
                    className="h-[150px] w-full object-cover"
                  />
                  <div className="p-3">
                    <p className="text-[14px]">{item.alt || <em style={{ color: "var(--muted)" }}>No description</em>}</p>
                    <p className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
                      {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                      {kb(item.bytes)} · {formatCreatedAt(item.created_at)}
                    </p>
                    {item.credit_text ? (
                      <p className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
                        {item.credit_text}
                      </p>
                    ) : null}

                    {used.length > 0 ? (
                      <p className="mt-2 text-[12px]" style={{ color: "var(--green)" }}>
                        In use — {used.join(", ")}
                      </p>
                    ) : (
                      <form action={removeMedia} className="mt-2">
                        <input type="hidden" name="mediaId" value={item.id} />
                        <ConfirmButton
                          confirm="Delete this photo? It isn't used anywhere right now."
                          className="link"
                          style={{ fontSize: 13, color: "#8C2F20" }}
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="display" style={{ fontSize: 22 }}>
          PDFs ({files.length})
        </h2>
        <ul className="rule-top-ink mt-3 list-none">
          {files.map((item) => {
            const used = usage.get(item.id) ?? [];
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <div>
                  <a href={mediaUrl(item.key)} target="_blank" rel="noreferrer" className="link">
                    {item.alt || item.key}
                  </a>
                  <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                    {kb(item.bytes)} · uploaded {formatCreatedAt(item.created_at)}
                    {used.length > 0 ? ` · ${used.join(", ")}` : " · not in use"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
