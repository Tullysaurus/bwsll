import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IMPORT_ORDER, ident, sqlValue, INTERNAL_TABLES } from "../scripts/cf.mjs";

/**
 * The export/import pair is the only code here that can lose a site's data, and it's the
 * least often run — so the round trip is pinned: take rows out of one database the way
 * `export.mjs` does, put them into an empty one the way `import.mjs` does, and everything
 * has to come back, ids and all.
 *
 * `scripts/` is plain Node, so this reaches into it directly rather than duplicating it.
 */

function freshDatabase(): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  for (const name of readdirSync(join(process.cwd(), "migrations")).filter((n) => n.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(join(process.cwd(), "migrations", name), "utf8"));
  }
  return sqlite;
}

/** What export.mjs writes to db/<table>.json. */
function exportRows(sqlite: DatabaseSync, table: string) {
  return sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
}

/** What import.mjs sends back. */
function importStatements(table: string, rows: Record<string, unknown>[]): string[] {
  if (!rows.length) return [];
  const columns = Object.keys(rows[0]);
  return rows.map(
    (row) =>
      `INSERT OR REPLACE INTO ${ident(table)} (${columns.map(ident).join(", ")}) ` +
      `VALUES (${columns.map((column) => sqlValue(row[column])).join(", ")})`,
  );
}

describe("export → import", () => {
  it("brings every row back, with its id", () => {
    const source = freshDatabase();
    source.exec(`
      INSERT INTO inquiries (id, type, name, email, data, status)
        VALUES (12, 'event', 'Ada', 'ada@example.com', '{"eventDate":"2026-10-01"}', 'new');
      INSERT INTO media (id, key, content_type, bytes, alt)
        VALUES (3, 'media/abc.webp', 'image/webp', 900, 'The green couch');
      INSERT INTO photo_slots (slot_id, media_id) VALUES ('home-gem', 3);
      INSERT INTO club_members (id, name, email, status, inquiry_id)
        VALUES (5, 'Bo', 'bo@example.com', 'active', 12);
    `);

    const target = freshDatabase();
    for (const table of ["media", "photo_slots", "inquiries", "club_members"]) {
      for (const statement of importStatements(table, exportRows(source, table))) target.exec(statement);
    }

    // The link between a club member and the request they came from is an id, so an
    // import that renumbered rows would leave it pointing at someone else.
    const member = target.prepare("SELECT * FROM club_members WHERE id = 5").get() as Record<string, unknown>;
    expect(member).toMatchObject({ name: "Bo", inquiry_id: 12 });
    expect(target.prepare("SELECT name FROM inquiries WHERE id = 12").get()).toEqual({ name: "Ada" });
    expect(target.prepare("SELECT media_id FROM photo_slots WHERE slot_id = 'home-gem'").get()).toEqual({
      media_id: 3,
    });
  });

  it("overwrites a seeded row that shares an id instead of colliding with it", () => {
    const target = freshDatabase(); // 0002 seeds five events
    const source = freshDatabase();
    source.exec("UPDATE events SET title = 'Renamed' WHERE id = 1");

    for (const statement of importStatements("events", exportRows(source, "events"))) target.exec(statement);

    expect(target.prepare("SELECT title FROM events WHERE id = 1").get()).toEqual({ title: "Renamed" });
    expect(target.prepare("SELECT COUNT(*) AS n FROM events").get()).toEqual({ n: 5 });
  });

  it("carries text that would otherwise break the SQL", () => {
    const source = freshDatabase();
    const notes = "O'Brien said \"yes\" — 50% off;\nDROP TABLE inquiries;--";
    source
      .prepare("INSERT INTO inquiries (type, name, email, data, notes) VALUES (?, ?, ?, ?, ?)")
      .run("contact", "O'Brien", "o@example.com", '{"message":"it\'s fine"}', notes);

    const target = freshDatabase();
    for (const statement of importStatements("inquiries", exportRows(source, "inquiries"))) {
      target.exec(statement);
    }

    const row = target.prepare("SELECT name, notes, data FROM inquiries").get() as Record<string, string>;
    expect(row.name).toBe("O'Brien");
    expect(row.notes).toBe(notes);
    expect(row.data).toBe('{"message":"it\'s fine"}');
  });

  it("keeps a NULL a NULL rather than the string 'null'", () => {
    expect(sqlValue(null)).toBe("NULL");
    expect(sqlValue(undefined)).toBe("NULL");
    expect(sqlValue(0)).toBe("0");
    expect(sqlValue("")).toBe("''");
  });
});

describe("import order", () => {
  it("lists every table the migrations create", () => {
    const sqlite = freshDatabase();
    const tables = (
      sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[]
    )
      .map((row) => row.name)
      .filter((name) => !(INTERNAL_TABLES as Set<string>).has(name));

    // A new table that nobody adds to IMPORT_ORDER still gets imported — last, after the
    // ones listed — but if it has a foreign key, last is not necessarily late enough.
    expect([...tables].sort()).toEqual([...IMPORT_ORDER].sort());
  });

  it("puts a parent before the rows that point at it", () => {
    const order = IMPORT_ORDER as string[];
    for (const [child, parent] of [
      ["photo_slots", "media"],
      ["documents", "media"],
      ["events", "inquiries"],
      ["club_members", "inquiries"],
    ]) {
      expect(order.indexOf(parent)).toBeLessThan(order.indexOf(child));
    }
  });
});
