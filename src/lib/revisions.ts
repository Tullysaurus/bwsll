import "server-only";
import { db, requireDb } from "./db";
import { ENTITIES, entityDef, jsonObjectSql, type EntityType } from "./entities";

/**
 * Revision history, soft delete and restore (v2 §2.2).
 *
 * Every admin write goes through `mutate()`, which runs the change *and* records a
 * snapshot in a single `db.batch()` — one implicit transaction, so a write can never
 * land without its history entry. Verified against D1: `last_insert_rowid()` resolves
 * to the row an earlier statement in the same batch inserted, and a failing statement
 * rolls the whole batch back.
 */

export type RevisionAction = "create" | "update" | "delete" | "restore";

export type RevisionRow = {
  id: number;
  entity_type: string;
  entity_id: string;
  action: RevisionAction;
  snapshot: string;
  user_email: string;
  created_at: string;
};

type MutateArgs = {
  entity: Exclude<EntityType, "setting">;
  action: RevisionAction;
  /**
   * The row being written. Omit **only** for a plain auto-increment INSERT, where the
   * new id is discovered via `last_insert_rowid()`. Anything else — an update, a delete,
   * a text primary key, or an upsert that might take its DO UPDATE branch — must pass
   * it, because `last_insert_rowid()` is set only by a successful INSERT and would
   * otherwise point at a stale or unrelated row.
   */
  id?: string | number;
  /** The write itself. Multiple statements run in order, before the snapshot is taken. */
  write: D1PreparedStatement | D1PreparedStatement[];
  user: string;
};

/** Runs a write and records its revision atomically. Returns the affected row's id. */
export async function mutate(args: MutateArgs): Promise<string> {
  const database = requireDb();
  const def = entityDef(args.entity);
  const writes = Array.isArray(args.write) ? args.write : [args.write];

  if (args.id === undefined && args.action !== "create") {
    throw new Error("mutate() needs an id for anything but a create");
  }

  // `rowid` rather than the id column: it is the alias for an INTEGER PRIMARY KEY and
  // still exists on tables keyed by text, so one form covers both.
  const known = args.id !== undefined;
  const where = known ? `${def.idColumn} = ?4` : "rowid = last_insert_rowid()";

  const binds: (string | number)[] = [args.entity, args.action, args.user];
  if (known) binds.push(normaliseId(args.id, def.idIsText));

  const snapshot = database
    .prepare(
      `INSERT INTO revisions (entity_type, entity_id, action, snapshot, user_email)
       SELECT ?1, CAST(${def.idColumn} AS TEXT), ?2, ${jsonObjectSql(def.columns)}, ?3
       FROM ${def.table}
       WHERE ${where}`,
    )
    .bind(...binds);

  // Reads the entity id back out of the revision the previous statement just wrote.
  const echo = database.prepare(
    "SELECT entity_id FROM revisions WHERE id = last_insert_rowid()",
  );

  const results = await database.batch<{ entity_id: string }>([...writes, snapshot, echo]);
  const echoed = results[results.length - 1]?.results?.[0]?.entity_id;

  if (!echoed) {
    throw new Error(
      `mutate(${args.entity}/${args.action}) wrote no revision — the target row was not found.`,
    );
  }
  return echoed;
}

function normaliseId(id: string | number | undefined, isText: boolean): string | number {
  if (id === undefined) throw new Error("mutate() needs an id for anything but a create");
  return isText ? String(id) : Number(id);
}

/* --- settings are versioned too, keyed by their settings key --- */

export async function recordSettingRevision(key: string, value: unknown, user: string) {
  await requireDb()
    .prepare(
      `INSERT INTO revisions (entity_type, entity_id, action, snapshot, user_email)
       VALUES ('setting', ?1, 'update', ?2, ?3)`,
    )
    .bind(key, JSON.stringify({ key, value }), user)
    .run();
}

/* --- reading history --- */

export async function listRevisions(
  entityType: EntityType,
  entityId: string,
  limit = 50,
): Promise<RevisionRow[]> {
  const database = db();
  if (!database) return [];
  const { results } = await database
    .prepare(
      `SELECT * FROM revisions WHERE entity_type = ?1 AND entity_id = ?2
       ORDER BY id DESC LIMIT ?3`,
    )
    .bind(entityType, entityId, limit)
    .all<RevisionRow>();
  return results ?? [];
}

export async function getRevision(id: number): Promise<RevisionRow | null> {
  const database = db();
  if (!database) return null;
  return (
    (await database.prepare("SELECT * FROM revisions WHERE id = ?1").bind(id).first<RevisionRow>()) ??
    null
  );
}

export function parseSnapshot(row: RevisionRow): Record<string, unknown> {
  try {
    return JSON.parse(row.snapshot) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/* --- soft delete, restore-from-trash and restore-a-version --- */

export async function softDelete(
  entity: Exclude<EntityType, "setting">,
  id: string | number,
  user: string,
) {
  const def = entityDef(entity);
  const database = requireDb();
  await mutate({
    entity,
    action: "delete",
    id,
    user,
    write: database
      .prepare(`UPDATE ${def.table} SET deleted_at = datetime('now') WHERE ${def.idColumn} = ?1`)
      .bind(normaliseId(id, def.idIsText)),
  });
}

/**
 * Writes a snapshot back over the live row, clearing `deleted_at`. Used both to pull a
 * record out of Trash and to roll one back to an earlier version.
 */
export async function restoreSnapshot(
  entity: Exclude<EntityType, "setting">,
  snapshot: Record<string, unknown>,
  user: string,
) {
  const def = entityDef(entity);
  const database = requireDb();
  const id = snapshot[def.idColumn];
  if (id === undefined || id === null) throw new Error("Snapshot has no id to restore to");

  const columns = def.columns;
  const values = columns.map((column) =>
    column === "deleted_at" ? null : ((snapshot[column] ?? null) as string | number | null),
  );
  const placeholders = columns.map((_, i) => `?${i + 1}`).join(", ");
  const updates = columns
    .filter((column) => column !== def.idColumn)
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");

  await mutate({
    entity,
    action: "restore",
    id: id as string | number,
    user,
    write: database
      .prepare(
        `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${placeholders})
         ON CONFLICT(${def.idColumn}) DO UPDATE SET ${updates}`,
      )
      .bind(...values),
  });
}

/* --- Trash --- */

export type TrashItem = {
  entity: Exclude<EntityType, "setting">;
  id: string;
  description: string;
  deletedAt: string;
};

export async function listTrash(): Promise<TrashItem[]> {
  const database = db();
  if (!database) return [];

  const items: TrashItem[] = [];
  for (const [entity, def] of Object.entries(ENTITIES) as [
    Exclude<EntityType, "setting">,
    (typeof ENTITIES)[keyof typeof ENTITIES],
  ][]) {
    const { results } = await database
      .prepare(
        `SELECT ${def.columns.join(", ")} FROM ${def.table}
         WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
      )
      .all<Record<string, unknown>>();
    for (const row of results ?? []) {
      items.push({
        entity,
        id: String(row[def.idColumn]),
        description: def.describe(row),
        deletedAt: String(row.deleted_at ?? ""),
      });
    }
  }
  return items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

/** Owner-only. Removes the row for good; revisions are kept as the audit trail. */
export async function purge(entity: Exclude<EntityType, "setting">, id: string) {
  const def = entityDef(entity);
  await requireDb()
    .prepare(`DELETE FROM ${def.table} WHERE ${def.idColumn} = ?1 AND deleted_at IS NOT NULL`)
    .bind(normaliseId(id, def.idIsText))
    .run();
}
