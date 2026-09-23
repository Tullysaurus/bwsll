import { DirtyForm } from "../DirtyForm";
import { guardPage } from "../Guard";
import { ShapeFields } from "../ShapeFields";
import { saveCopy } from "../content-actions";
import { getCopy } from "@/lib/content";
import { groupsOf } from "@/lib/shape-form";

export const dynamic = "force-dynamic";

export default async function AdminTextPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const copy = await getCopy();
  const groups = groupsOf(copy as unknown as Record<string, unknown>);

  return (
    <div className="max-w-[760px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Page text
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        The words on each page of the website. Headings are split in two — the second
        half is the part shown in italics.
      </p>

      <DirtyForm action={saveCopy} className="mt-8" saveLabel="Save text">
        <ShapeFields groups={groups} />
      </DirtyForm>
    </div>
  );
}
