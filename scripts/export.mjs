#!/usr/bin/env node
/**
 * Takes a full copy of a site: every row in D1, and every file in R2 that a row points at.
 *
 *   node scripts/export.mjs --env dev
 *   node scripts/export.mjs --env production
 *   node scripts/export.mjs --env dev --local        (the local development database)
 *   node scripts/export.mjs --env dev --out somewhere/else
 *
 * D1 is the manifest for R2, so nothing has to list the bucket: every uploaded file has a
 * `media` row, and the two font files live at fixed keys. Generated menu PDFs are skipped
 * — they're a cache, rebuilt on demand from the menu rows.
 *
 * The result is a directory under backup/ (gitignored) that `import.mjs` reads back.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fail, option, plural, query, tables, target, wrangler } from "./cf.mjs";

const FONT_KEYS = ["fonts/menu-display.ttf", "fonts/menu-body.ttf", "fonts/menu-body-bold.ttf"];

const t = target();
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const out = option("--out", join("backup", `${t.db}-${stamp}`));

console.log(`Exporting ${t.label} — database ${t.db}, bucket ${t.bucket}\n`);

mkdirSync(join(out, "db"), { recursive: true });

const counts = {};
for (const table of tables(t)) {
  const rows = query(t, `SELECT * FROM ${table}`);
  writeFileSync(join(out, "db", `${table}.json`), JSON.stringify(rows, null, 2), "utf8");
  counts[table] = rows.length;
  console.log(`  ${String(rows.length).padStart(6)}  ${table}`);
}

if (!Object.keys(counts).length) fail(`No tables in ${t.db}. Has it been migrated?`);

const applied = query(t, "SELECT name FROM d1_migrations ORDER BY id").map((row) => row.name);

// Live rows only. Deleting a photo already removes its R2 object once nothing else
// points at the key (see deleteMedia), so a deleted row's file is gone from the bucket
// before a backup could ever reach it — asking for it would only produce false alarms.
const keys = [
  ...new Set([
    ...query(t, "SELECT key FROM media WHERE deleted_at IS NULL ORDER BY id").map((row) => row.key),
    ...FONT_KEYS,
  ]),
];

console.log(`\nFiles (${plural(keys.length, "key")})`);

const saved = [];
const missing = [];
for (const key of keys) {
  const path = join(out, "files", key);
  mkdirSync(dirname(path), { recursive: true });
  const ok = wrangler(
    ["r2", "object", "get", `${t.bucket}/${key}`, "--file", path, ...t.whereFlag],
    { quiet: true, allowFail: true },
  );
  if (ok === null) {
    // A failed `get` still leaves the empty file it opened; an empty font is worse than
    // no font, so it doesn't get to sit in the backup.
    rmSync(path, { force: true });
    missing.push(key);
    console.log(`  missing   ${key}`);
  } else {
    saved.push(key);
    console.log(`  saved     ${key}`);
  }
}

writeFileSync(
  join(out, "manifest.json"),
  JSON.stringify(
    {
      site: "bwsll",
      env: t.env,
      local: t.local,
      database: t.db,
      bucket: t.bucket,
      createdAt: new Date().toISOString(),
      migrations: applied,
      tables: counts,
      files: saved,
      missingFiles: missing,
    },
    null,
    2,
  ),
  "utf8",
);

const rowTotal = Object.values(counts).reduce((sum, n) => sum + n, 0);
console.log(`\n✓ ${plural(rowTotal, "row")} and ${plural(saved.length, "file")} → ${out}`);
if (missing.length) {
  console.log(
    `  ${plural(missing.length, "key")} had no file in R2. A missing font is fine (the PDF falls\n` +
      "  back to a standard face); a missing media key means an upload that never landed.",
  );
}
console.log("  Check it with: node scripts/verify.mjs --env " + t.env + " --from " + out);
