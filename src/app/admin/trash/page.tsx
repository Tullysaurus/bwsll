import Link from "next/link";
import { purgeForever, restoreFromTrash } from "../actions";
import { guardPage } from "../Guard";
import { ConfirmButton } from "../ConfirmButton";
import { listTrash } from "@/lib/revisions";
import { ENTITY_LABEL } from "@/lib/entities";
import { can } from "@/lib/permissions";
import { formatCreatedAt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const guard = await guardPage();
  if (!guard.ok) return guard.screen;

  const items = await listTrash();
  const mayPurge = can(guard.user.role, "trash.purge");

  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const bucket = groups.get(item.entity);
    if (bucket) bucket.push(item);
    else groups.set(item.entity, [item]);
  }

  return (
    <div className="max-w-[820px]">
      <h1 className="display" style={{ fontSize: 32 }}>
        Trash
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--muted)" }}>
        Deleted items are kept here so nothing is lost by accident. Restoring puts an item
        back exactly as it was.
      </p>

      {items.length === 0 ? (
        <p className="mt-8 text-[16px]" style={{ color: "var(--muted)" }}>
          Trash is empty.
        </p>
      ) : (
        [...groups.entries()].map(([entity, rows]) => (
          <section key={entity} className="mt-8">
            <h2 className="display" style={{ fontSize: 22 }}>
              {ENTITY_LABEL[entity as keyof typeof ENTITY_LABEL]}
            </h2>
            <ul className="rule-top-ink mt-3 list-none">
              {rows.map((item) => (
                <li
                  key={`${item.entity}-${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <div>
                    <p className="text-[16px]">{item.description}</p>
                    <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                      Deleted {formatCreatedAt(item.deletedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <Link
                      href={`/admin/history/${item.entity}/${encodeURIComponent(item.id)}`}
                      className="link"
                      style={{ fontSize: 14 }}
                    >
                      History
                    </Link>
                    <form action={restoreFromTrash}>
                      <input type="hidden" name="entity" value={item.entity} />
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="link" style={{ fontSize: 14 }}>
                        Restore
                      </button>
                    </form>
                    {mayPurge ? (
                      <form action={purgeForever}>
                        <input type="hidden" name="entity" value={item.entity} />
                        <input type="hidden" name="id" value={item.id} />
                        <ConfirmButton
                          confirm="Delete this forever? This cannot be undone."
                          className="link"
                          style={{ fontSize: 14, color: "#8C2F20" }}
                        >
                          Delete forever
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
