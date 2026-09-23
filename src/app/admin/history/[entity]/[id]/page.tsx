import Link from "next/link";
import { notFound } from "next/navigation";
import { restoreRevision } from "../../../actions";
import { guardPage } from "../../../Guard";
import { ConfirmButton } from "../../../ConfirmButton";
import { ENTITIES, ENTITY_LABEL, type EntityType } from "@/lib/entities";
import { listRevisions, parseSnapshot, type RevisionRow } from "@/lib/revisions";
import { formatCreatedAt } from "@/lib/format";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  create: "Created",
  update: "Edited",
  delete: "Deleted",
  restore: "Restored",
};

/** Fields worth showing in the summary, per entity. */
const SUMMARY_FIELDS: Record<string, string[]> = {
  event: ["title", "starts_at", "ends_at", "location", "kind", "published"],
  inquiry: ["status", "notes"],
  subscriber: ["email", "source"],
  setting: ["key", "value"],
};

function summarise(row: RevisionRow): { label: string; value: string }[] {
  const snapshot = parseSnapshot(row);
  const fields = SUMMARY_FIELDS[row.entity_type] ?? Object.keys(snapshot);
  return fields
    .filter((field) => snapshot[field] !== undefined && snapshot[field] !== null && snapshot[field] !== "")
    .map((field) => ({
      label: field.replace(/_/g, " "),
      value:
        typeof snapshot[field] === "object"
          ? JSON.stringify(snapshot[field])
          : String(snapshot[field]),
    }));
}

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const { entity, id } = await params;
  const decodedId = decodeURIComponent(id);
  const isSetting = entity === "setting";
  if (!isSetting && !(entity in ENTITIES)) notFound();

  const revisions = await listRevisions(entity as EntityType, decodedId);
  const backHref = isSetting
    ? "/admin/settings"
    : ENTITIES[entity as Exclude<EntityType, "setting">].href(decodedId);

  return (
    <div className="max-w-[820px]">
      <Link href={backHref} className="link">
        ← Back
      </Link>

      <h1 className="display mt-4" style={{ fontSize: 32 }}>
        History
      </h1>
      <p className="mt-1 text-[15px]" style={{ color: "var(--muted)" }}>
        {ENTITY_LABEL[entity as EntityType] ?? entity} · {decodedId}
      </p>

      {revisions.length === 0 ? (
        <p className="mt-8 text-[16px]" style={{ color: "var(--muted)" }}>
          No changes recorded yet.
        </p>
      ) : (
        <ul className="rule-top-ink mt-6 list-none">
          {revisions.map((row, index) => (
            <li key={row.id} className="py-5" style={{ borderBottom: "1px solid var(--line)" }}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-[16px]">
                  <strong>{ACTION_LABEL[row.action] ?? row.action}</strong> by {row.user_email}
                  {index === 0 ? (
                    <span className="pill ml-3" style={{ fontSize: 11, padding: "3px 9px" }}>
                      Current
                    </span>
                  ) : null}
                </p>
                <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                  {formatCreatedAt(row.created_at)}
                </p>
              </div>

              <dl className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-[160px_1fr]">
                {summarise(row).map((field) => (
                  <div key={field.label} className="contents">
                    <dt className="text-[13px] capitalize" style={{ color: "var(--muted)" }}>
                      {field.label}
                    </dt>
                    <dd className="text-[15px] break-words">{field.value}</dd>
                  </div>
                ))}
              </dl>

              {index === 0 ? null : (
                <form action={restoreRevision} className="mt-3">
                  <input type="hidden" name="revisionId" value={row.id} />
                  <ConfirmButton
                    confirm="Put this version back? The current version stays in the history."
                    className="link"
                    style={{ fontSize: 14 }}
                  >
                    Restore this version
                  </ConfirmButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
