/**
 * The registry that drives revision history, Trash and Restore (v2 §2.2).
 *
 * One entry per soft-deletable record type. `columns` is the full column list used to
 * build the JSON snapshot and to replay it on restore, so adding a column to a table
 * means adding it here too — otherwise it silently stops being versioned.
 */

export const ENTITY_TYPES = ["event", "inquiry", "subscriber", "setting"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export type EntityDef = {
  table: string;
  idColumn: string;
  /** True when the id is a TEXT column, so the WHERE binding isn't coerced. */
  idIsText: boolean;
  columns: readonly string[];
  singular: string;
  plural: string;
  /** Where Trash and History link to for this record. */
  href: (id: string) => string;
  /** Human label for a row, read from a snapshot. */
  describe: (snapshot: Record<string, unknown>) => string;
};

const str = (value: unknown, fallback = "—") =>
  typeof value === "string" && value.trim() ? value : fallback;

/** Tables that `mutate()` can version. `setting` is handled separately (see revisions.ts). */
export const ENTITIES: Record<Exclude<EntityType, "setting">, EntityDef> = {
  event: {
    table: "events",
    idColumn: "id",
    idIsText: false,
    columns: [
      "id",
      "title",
      "starts_at",
      "ends_at",
      "location",
      "kind",
      "description",
      "published",
      "created_at",
      "deleted_at",
    ],
    singular: "Event",
    plural: "Events",
    href: (id) => `/admin/events/${id}`,
    describe: (s) => `${str(s.title, "Untitled event")} — ${str(s.starts_at)}`,
  },
  inquiry: {
    table: "inquiries",
    idColumn: "id",
    idIsText: false,
    columns: [
      "id",
      "type",
      "name",
      "email",
      "phone",
      "data",
      "status",
      "notes",
      "created_at",
      "deleted_at",
    ],
    singular: "Inquiry",
    plural: "Inquiries",
    href: (id) => `/admin/inquiries/${id}`,
    describe: (s) => `${str(s.type)} request from ${str(s.name, "someone")}`,
  },
  subscriber: {
    table: "subscribers",
    idColumn: "email",
    idIsText: true,
    columns: ["email", "source", "created_at", "deleted_at"],
    singular: "Subscriber",
    plural: "Subscribers",
    href: () => "/admin/subscribers",
    describe: (s) => str(s.email),
  },
};

export function entityDef(type: Exclude<EntityType, "setting">): EntityDef {
  return ENTITIES[type];
}

export const ENTITY_LABEL: Record<EntityType, string> = {
  event: "Event",
  inquiry: "Inquiry",
  subscriber: "Subscriber",
  setting: "Setting",
};

/** `json_object('col', col, …)` for the snapshot column list. */
export function jsonObjectSql(columns: readonly string[]): string {
  return `json_object(${columns.map((c) => `'${c}', ${c}`).join(", ")})`;
}
