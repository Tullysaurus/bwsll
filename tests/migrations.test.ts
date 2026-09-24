import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Migration 0007 rebuilds the `inquiries` table, which is the one migration in this
 * project that can lose data if it's wrong: SQLite can't alter a CHECK constraint, so
 * the table is copied, dropped and renamed. These tests run it over a database that
 * already has rows in it — ids, payments and the index all have to come out the far side.
 */

const files = readdirSync(join(process.cwd(), "migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort();

const sqlFor = (prefix: string) =>
  readFileSync(join(process.cwd(), "migrations", files.find((name) => name.startsWith(prefix))!), "utf8");

/** A database with every migration up to, but not including, `stopBefore`. */
function dbUpTo(stopBefore: string): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  for (const name of files) {
    if (name.startsWith(stopBefore)) break;
    sqlite.exec(readFileSync(join(process.cwd(), "migrations", name), "utf8"));
  }
  return sqlite;
}

describe("0007 — rebuilding inquiries", () => {
  it("carries every row across with its id intact", () => {
    const sqlite = dbUpTo("0007");

    sqlite.exec(`
      INSERT INTO inquiries (id, type, name, email, phone, data, status, notes)
      VALUES (7, 'event', 'Ada', 'ada@example.com', '918', '{"eventDate":"2026-10-01"}', 'replied', 'called back'),
             (9, 'workforce', 'Sam', 'sam@example.com', NULL, '{}', 'new', NULL);
      UPDATE inquiries SET deleted_at = '2026-09-01' WHERE id = 9;
    `);

    sqlite.exec(sqlFor("0007"));

    const rows = sqlite.prepare("SELECT * FROM inquiries ORDER BY id").all() as Record<string, unknown>[];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: 7,
      type: "event",
      name: "Ada",
      status: "replied",
      notes: "called back",
      deposit_paid: 0,
      balance_paid: 0,
    });
    expect(rows[0].data).toBe('{"eventDate":"2026-10-01"}');
    // A soft-deleted row stays soft-deleted rather than quietly coming back.
    expect(rows[1]).toMatchObject({ id: 9, type: "workforce", deleted_at: "2026-09-01" });
  });

  it("keeps ids unique after the rebuild, so the next insert doesn't collide", () => {
    const sqlite = dbUpTo("0007");
    sqlite.exec(
      `INSERT INTO inquiries (id, type, name, email, data) VALUES (41, 'contact', 'Ada', 'a@b.c', '{}')`,
    );
    sqlite.exec(sqlFor("0007"));

    sqlite.exec(`INSERT INTO inquiries (type, name, email, data) VALUES ('contact', 'Bo', 'b@c.d', '{}')`);
    const ids = (sqlite.prepare("SELECT id FROM inquiries ORDER BY id").all() as { id: number }[]).map(
      (row) => row.id,
    );
    expect(ids).toEqual([41, 42]);
  });

  it("recreates the index the dropped table took with it", () => {
    const sqlite = dbUpTo("0007");
    sqlite.exec(sqlFor("0007"));
    const indexes = (
      sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'inquiries'")
        .all() as { name: string }[]
    ).map((row) => row.name);
    expect(indexes).toContain("inquiries_status");
  });

  it("accepts the new partner type and still refuses an unknown one", () => {
    const sqlite = dbUpTo("0007");
    sqlite.exec(sqlFor("0007"));

    sqlite.exec(`INSERT INTO inquiries (type, name, email, data) VALUES ('partner', 'Ada', 'a@b.c', '{}')`);
    expect(() =>
      sqlite.exec(`INSERT INTO inquiries (type, name, email, data) VALUES ('whatever', 'Ada', 'a@b.c', '{}')`),
    ).toThrow();
  });
});

describe("0008 — club members", () => {
  it("holds a member and refuses a status that isn't one of the four", () => {
    const sqlite = dbUpTo("0009_nothing");

    sqlite.exec(
      `INSERT INTO club_members (name, email, status, start_date) VALUES ('Ada', 'a@b.c', 'active', '2026-09-01')`,
    );
    const row = sqlite.prepare("SELECT * FROM club_members").get() as Record<string, unknown>;
    expect(row).toMatchObject({ name: "Ada", status: "active", deleted_at: null });

    expect(() =>
      sqlite.exec(`INSERT INTO club_members (name, email, status) VALUES ('Bo', 'b@c.d', 'lapsed')`),
    ).toThrow();
  });
});
