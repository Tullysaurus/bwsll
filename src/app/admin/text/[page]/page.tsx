import Link from "next/link";
import { notFound } from "next/navigation";
import { DirtyForm } from "../../DirtyForm";
import { guardPage } from "../../Guard";
import { ShapeFields } from "../../ShapeFields";
import { saveCopy } from "../../content-actions";
import { getCopy } from "@/lib/content";
import { findCopyPage, pageGroups } from "@/lib/field-labels";

export const dynamic = "force-dynamic";

export default async function AdminTextPage({ params }: { params: Promise<{ page: string }> }) {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const { page: slug } = await params;
  const page = findCopyPage(slug);
  if (!page) notFound();

  const copy = await getCopy();

  return (
    <div className="max-w-[760px]">
      <Link href="/admin/text" className="link">
        ← All pages
      </Link>

      <h1 className="display mt-4" style={{ fontSize: 32 }}>
        {page.label}
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        {page.blurb}{" "}
        <Link href={page.href} className="link" target="_blank">
          See the page
        </Link>
      </p>

      {/* Only this page's fields are on the form; everything else keeps its current
          value, because the save reads against the copy that's live right now. */}
      <DirtyForm action={saveCopy} className="mt-8" saveLabel="Save this page">
        <ShapeFields groups={pageGroups(copy, page)} />
      </DirtyForm>
    </div>
  );
}
