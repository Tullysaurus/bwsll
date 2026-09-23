import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * A D1-shaped shim over `node:sqlite`, so the SQL that `src/lib/revisions.ts` generates
 * can be exercised in tests without a Worker.
 *
 * It reproduces the two behaviours `mutate()` depends on, both verified against real
 * local D1 first: statements in a batch run sequentially on one connection (so
 * `last_insert_rowid()` sees the previous statement's insert), and a failure rolls the
 * whole batch back.
 */
export function createTestDb(): D1Database {
  const sqlite = new DatabaseSync(":memory:");

  const migrationsDir = join(process.cwd(), "migrations");
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    // The seed migration is not needed and its data would skew assertions.
    if (file.includes("_seed")) continue;
    sqlite.exec(readFileSync(join(migrationsDir, file), "utf8"));
  }

  const makeStatement = (query: string, bound: unknown[] = []): D1PreparedStatement => ({
    bind: (...values: unknown[]) => makeStatement(query, values),
    first: async <T>() => {
      const row = sqlite.prepare(query).get(...(bound as never[]));
      return (row as T) ?? null;
    },
    run: async <T>() => {
      sqlite.prepare(query).run(...(bound as never[]));
      return { results: [] as T[], success: true, meta: {} };
    },
    all: async <T>() => {
      const rows = sqlite.prepare(query).all(...(bound as never[]));
      return { results: rows as T[], success: true, meta: {} };
    },
  });

  return {
    prepare: (query: string) => makeStatement(query),
    batch: async <T>(statements: D1PreparedStatement[]) => {
      sqlite.exec("BEGIN");
      try {
        const out: D1Result<T>[] = [];
        for (const statement of statements) out.push(await statement.all<T>());
        sqlite.exec("COMMIT");
        return out;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
    exec: async (query: string) => {
      sqlite.exec(query);
      return { count: 0, duration: 0 };
    },
  };
}
