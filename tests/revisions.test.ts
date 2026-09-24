import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./d1";

let database: D1Database;

// `@/lib/db` reaches for Cloudflare bindings, which don't exist in a test process.
vi.mock("@/lib/db", () => ({
  db: () => database,
  requireDb: () => database,
}));

const { mutate, listRevisions, parseSnapshot, softDelete, restoreSnapshot, listTrash, purge } =
  await import("@/lib/revisions");

const USER = "owner@example.com";

const insertEvent = (title: string) =>
  database
    .prepare(
      "INSERT INTO events (title, starts_at, location, kind, published) VALUES (?1, '2030-05-01T18:00', 'Liquid Lounge', 'public', 1)",
    )
    .bind(title);

beforeEach(() => {
  database = createTestDb();
});

describe("listTrash", () => {
  it("keeps deleted workforce applications away from staff", async () => {
    await database
      .prepare(
        `INSERT INTO inquiries (type, name, email, data, deleted_at)
         VALUES ('workforce', 'Teen', 't@example.com', '{}', '2026-09-01'),
                ('event', 'Ada', 'a@example.com', '{}', '2026-09-01')`,
      )
      .run();

    const forStaff = await listTrash();
    expect(forStaff.map((item) => item.description)).toEqual([
      expect.stringContaining("event request from Ada"),
    ]);

    const forOwner = await listTrash({ includeWorkforce: true });
    expect(forOwner).toHaveLength(2);
  });
});

describe("mutate", () => {
  it("records a create and reports the new id", async () => {
    const id = await mutate({ entity: "event", action: "create", user: USER, write: insertEvent("Open mic") });

    expect(Number(id)).toBeGreaterThan(0);
    const revisions = await listRevisions("event", id);
    expect(revisions).toHaveLength(1);
    expect(revisions[0].action).toBe("create");
    expect(revisions[0].user_email).toBe(USER);
    // The snapshot is the row as it stands AFTER the write, not the input.
    expect(parseSnapshot(revisions[0])).toMatchObject({ title: "Open mic", kind: "public" });
  });

  it("builds a history in order", async () => {
    const id = await mutate({ entity: "event", action: "create", user: USER, write: insertEvent("Draft") });
    await mutate({
      entity: "event",
      action: "update",
      id,
      user: USER,
      write: database.prepare("UPDATE events SET title = 'Renamed' WHERE id = ?1").bind(Number(id)),
    });

    const revisions = await listRevisions("event", id);
    expect(revisions.map((r) => r.action)).toEqual(["update", "create"]);
    expect(parseSnapshot(revisions[0]).title).toBe("Renamed");
    expect(parseSnapshot(revisions[1]).title).toBe("Draft");
  });

  it("refuses to record a revision for a row that isn't there", async () => {
    await expect(
      mutate({
        entity: "event",
        action: "update",
        id: 9999,
        user: USER,
        write: database.prepare("UPDATE events SET title = 'nope' WHERE id = 9999"),
      }),
    ).rejects.toThrow(/wrote no revision/);
  });
});

describe("soft delete, trash and restore", () => {
  it("hides a deleted row from Trash's siblings but keeps it restorable", async () => {
    const id = await mutate({ entity: "event", action: "create", user: USER, write: insertEvent("Live music") });

    await softDelete("event", id, USER);
    const trash = await listTrash();
    expect(trash).toHaveLength(1);
    expect(trash[0]).toMatchObject({ entity: "event", id });
    expect(trash[0].description).toContain("Live music");

    await mutate({
      entity: "event",
      action: "restore",
      id,
      user: USER,
      write: database.prepare("UPDATE events SET deleted_at = NULL WHERE id = ?1").bind(Number(id)),
    });
    expect(await listTrash()).toHaveLength(0);
  });

  it("rolls a record back to an earlier version", async () => {
    const id = await mutate({ entity: "event", action: "create", user: USER, write: insertEvent("Original") });
    await mutate({
      entity: "event",
      action: "update",
      id,
      user: USER,
      write: database.prepare("UPDATE events SET title = 'Changed' WHERE id = ?1").bind(Number(id)),
    });

    const history = await listRevisions("event", id);
    const original = history.find((r) => r.action === "create")!;
    await restoreSnapshot("event", parseSnapshot(original), USER);

    const row = await database
      .prepare("SELECT title, deleted_at FROM events WHERE id = ?1")
      .bind(Number(id))
      .first<{ title: string; deleted_at: string | null }>();
    expect(row?.title).toBe("Original");
    expect(row?.deleted_at).toBeNull();

    // A restore is itself a revision, so nothing is lost.
    expect((await listRevisions("event", id)).map((r) => r.action)).toEqual([
      "restore",
      "update",
      "create",
    ]);
  });

  it("restores a soft-deleted subscriber by its text primary key", async () => {
    const email = "fan@example.com";
    await mutate({
      entity: "subscriber",
      action: "create",
      id: email,
      user: USER,
      write: database
        .prepare("INSERT INTO subscribers (email, source) VALUES (?1, 'footer')")
        .bind(email),
    });

    await softDelete("subscriber", email, USER);
    expect((await listTrash())[0]).toMatchObject({ entity: "subscriber", id: email });

    const history = await listRevisions("subscriber", email);
    await restoreSnapshot("subscriber", parseSnapshot(history.at(-1)!), USER);
    expect(await listTrash()).toHaveLength(0);
  });

  it("purges only what is already in the trash", async () => {
    const id = await mutate({ entity: "event", action: "create", user: USER, write: insertEvent("Keep me") });

    await purge("event", id); // still live — must be a no-op
    expect(
      await database.prepare("SELECT id FROM events WHERE id = ?1").bind(Number(id)).first(),
    ).not.toBeNull();

    await softDelete("event", id, USER);
    await purge("event", id);
    expect(
      await database.prepare("SELECT id FROM events WHERE id = ?1").bind(Number(id)).first(),
    ).toBeNull();
    // The audit trail outlives the record.
    expect((await listRevisions("event", id)).length).toBeGreaterThan(0);
  });
});

describe("batch atomicity", () => {
  it("rolls the write back when the revision cannot be written", async () => {
    const before = await database.prepare("SELECT COUNT(*) AS n FROM events").first<{ n: number }>();
    await expect(
      database.batch([
        insertEvent("Half-written"),
        database.prepare("INSERT INTO revisions (entity_type) VALUES ('event')"), // NOT NULL violation
      ]),
    ).rejects.toThrow();
    const after = await database.prepare("SELECT COUNT(*) AS n FROM events").first<{ n: number }>();
    expect(after?.n).toBe(before?.n);
  });
});
