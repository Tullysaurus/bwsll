import { DirtyForm } from "../DirtyForm";
import { HistoryLinks } from "../HistoryLinks";
import { guardPage } from "../Guard";
import { ShapeFields } from "../ShapeFields";
import { saveLegal } from "../content-actions";
import { getLegal } from "@/lib/content";
import { groupsOf } from "@/lib/shape-form";

export const dynamic = "force-dynamic";

export default async function AdminLegalPage() {
  const guard = await guardPage("settings.legal");
  if (!guard.ok) return guard.screen;

  const legal = await getLegal();
  const groups = groupsOf(legal as unknown as Record<string, unknown>);

  return (
    <div className="max-w-[760px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Privacy &amp; terms
      </h1>
      <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
        The text on the Privacy notice and Terms pages. These are legal promises to the
        people who use the site — have a lawyer read anything you rewrite here, and update
        &ldquo;Last updated&rdquo; when you do.
      </p>

      <DirtyForm action={saveLegal} className="mt-8" saveLabel="Save legal text">
        <ShapeFields groups={groups} />
      </DirtyForm>

      <HistoryLinks keys={["legal"]} />
    </div>
  );
}
