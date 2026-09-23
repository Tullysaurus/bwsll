import Link from "next/link";
import { notFound } from "next/navigation";
import { restoreRevision } from "../../../actions";
import { guardPage } from "../../../Guard";
import { ConfirmButton } from "../../../ConfirmButton";
import { ENTITIES, ENTITY_LABEL, type EntityType } from "@/lib/entities";
import { listRevisions, parseSnapshot, type RevisionRow } from "@/lib/revisions";
import { formatCreatedAt } from "@/lib/format";
import {
  changedFields,
  EMPTY,
  recordField,
  SETTING_HOME,
  SETTING_LABEL,
  settingFields,
  type DisplayField,
  type FieldChange,
} from "@/lib/history-format";

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
  closure: ["start_date", "end_date", "closed", "note"],
};

/** How many fields to print for a version with nothing to compare against. */
const FULL_LIMIT = 14;

function fieldsOfRevision(row: RevisionRow, settingKey: string | null): DisplayField[] {
  const snapshot = parseSnapshot(row);

  if (settingKey) return settingFields(settingKey, snapshot.value);

  const names = SUMMARY_FIELDS[row.entity_type] ?? Object.keys(snapshot);
  return names
    .filter((name) => snapshot[name] !== undefined && snapshot[name] !== null && snapshot[name] !== "")
    .map((name) => recordField(name, snapshot[name]));
}

function Value({ children, muted }: { children: string; muted?: boolean }) {
  const empty = children === EMPTY;
  return (
    <span
      className="text-[15px] break-words"
      style={{ color: empty || muted ? "var(--muted)" : "var(--ink)", fontStyle: empty ? "italic" : undefined }}
    >
      {children}
    </span>
  );
}

function Changes({ changes }: { changes: FieldChange[] }) {
  if (!changes.length) {
    return (
      <p className="mt-3 text-[15px]" style={{ color: "var(--muted)" }}>
        Saved with no changes.
      </p>
    );
  }

  return (
    <ul className="mt-3 grid list-none gap-2">
      {changes.map((change) => (
        <li key={change.label}>
          <p className="text-[13px] capitalize" style={{ color: "var(--muted)" }}>
            {change.label}
          </p>
          <p className="flex flex-wrap items-baseline gap-2">
            <Value muted>{change.from}</Value>
            <span aria-hidden style={{ color: "var(--muted)" }}>
              →
            </span>
            <Value>{change.to}</Value>
          </p>
        </li>
      ))}
    </ul>
  );
}

function Snapshot({ fields }: { fields: DisplayField[] }) {
  const shown = fields.slice(0, FULL_LIMIT);
  return (
    <>
      <dl className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-[180px_1fr]">
        {shown.map((field) => (
          <div key={field.label} className="contents">
            <dt className="text-[13px] capitalize" style={{ color: "var(--muted)" }}>
              {field.label}
            </dt>
            <dd>
              <Value>{field.value}</Value>
            </dd>
          </div>
        ))}
      </dl>
      {fields.length > shown.length ? (
        <p className="mt-2 text-[14px]" style={{ color: "var(--muted)" }}>
          …and {fields.length - shown.length} more {fields.length - shown.length === 1 ? "field" : "fields"}.
        </p>
      ) : null}
    </>
  );
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

  const settingKey = isSetting ? decodedId : null;
  const revisions = await listRevisions(entity as EntityType, decodedId);
  const backHref = settingKey
    ? (SETTING_HOME[settingKey] ?? "/admin/settings")
    : ENTITIES[entity as Exclude<EntityType, "setting">].href(decodedId);

  // Each version is described by what it changed, so the version before it is read too.
  const fields = revisions.map((row) => fieldsOfRevision(row, settingKey));

  return (
    <div className="max-w-[820px]">
      <Link href={backHref} className="link">
        ← Back
      </Link>

      <h1 className="display mt-4" style={{ fontSize: 32 }}>
        History
      </h1>
      <p className="mt-1 text-[15px]" style={{ color: "var(--muted)" }}>
        {settingKey
          ? (SETTING_LABEL[settingKey] ?? settingKey.replace(/_/g, " "))
          : `${ENTITY_LABEL[entity as EntityType] ?? entity} · ${decodedId}`}
      </p>

      {revisions.length === 0 ? (
        <p className="mt-8 text-[16px]" style={{ color: "var(--muted)" }}>
          No changes recorded yet.
        </p>
      ) : (
        <ul className="rule-top-ink mt-6 list-none">
          {revisions.map((row, index) => {
            const previous = fields[index + 1];
            return (
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

                {previous ? (
                  <Changes changes={changedFields(previous, fields[index])} />
                ) : (
                  <Snapshot fields={fields[index]} />
                )}

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
            );
          })}
        </ul>
      )}
    </div>
  );
}
