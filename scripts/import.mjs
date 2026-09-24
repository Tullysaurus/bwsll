#!/usr/bin/env node
/**
 * Puts an export back — into a fresh account, or over a database you're willing to lose.
 *
 *   node scripts/import.mjs --env production --from backup/bwsll-2026-09-23T...
 *   node scripts/import.mjs --env dev --local --from backup/...   (into local development)
 *
 * Rows keep their ids. That matters: revisions, Deleted items, the events created from an
 * inquiry and the club members linked to one all refer to rows by id, and renumbering
 * would quietly break every one of those links.
 *
 * Refuses to run if the target already has real data — an inquiry, a subscriber, an
 * uploaded file, a club member — unless you pass --force. The rows a fresh `db:migrate`
 * seeds don't count: the import overwrites the ones whose ids it reuses. A seeded row the
 * export doesn't have an id for stays, and verify reports that table as having more rows
 * than the export, which is the point of running it afterwards.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  executeBatched,
  fail,
  flag,
  ident,
  option,
  plural,
  query,
  sqlValue,
  tables,
  target,
  wrangler,
} from "./cf.mjs";

/** Empty on a freshly migrated database, so anything here means the target is in use. */
const OCCUPIED_BY = ["inquiries", "subscribers", "media", "club_members", "admin_users", "closures"];

const CONTENT_TYPES = {
  pdf: "application/pdf",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  ttf: "font/ttf",
};

const t = target();
const from = option("--from", null);
const force = flag("--force");

if (!from) fail("--from <backup directory> is required. Make one with scripts/export.mjs.");
if (!existsSync(join(from, "manifest.json"))) fail(`${from} has no manifest.json — is it an export?`);

const manifest = JSON.parse(readFileSync(join(from, "manifest.json"), "utf8"));

console.log(`Importing ${from}`);
console.log(`  taken from ${manifest.database} on ${new Date(manifest.createdAt).toLocaleString()}`);
console.log(`  into ${t.label} — database ${t.db}, bucket ${t.bucket}\n`);

// 1. The schema has to be there first, and has to be at least as new as the export.
const applied = query(t, "SELECT name FROM d1_migrations ORDER BY id").map((row) => row.name);
if (!applied.length) {
  fail(`${t.db} has no tables yet. Run the migrations first:\n    npx wrangler d1 migrations apply ${t.db} ${t.whereFlag[0]}${t.envFlag.length ? " --env production" : ""}`);
}
const behind = (manifest.migrations ?? []).filter((name) => !applied.includes(name));
if (behind.length) {
  fail(
    `${t.db} is behind the export by ${plural(behind.length, "migration")} (${behind.join(", ")}).\n` +
      `  Apply them first, or the import will fail on columns that don't exist yet.`,
  );
}

// 2. Don't quietly write over a site someone is using.
if (!force) {
  const busy = OCCUPIED_BY.filter((table) => {
    const [row] = query(t, `SELECT COUNT(*) AS n FROM ${ident(table)}`);
    return Number(row?.n ?? 0) > 0;
  });
  if (busy.length) {
    fail(
      `${t.db} already holds data (${busy.join(", ")}).\n` +
        "  Take an export of it first, then re-run with --force if you really mean to overwrite.",
    );
  }
}

// 3. Files before rows, so a media row never points at a file that isn't there yet.
const filesDir = join(from, "files");
const files = existsSync(filesDir) ? walk(filesDir) : [];
console.log(`Files (${plural(files.length, "file")})`);
for (const path of files) {
  // R2 keys are slash-separated whatever the machine running this uses in its paths.
  const key = relative(filesDir, path).split(sep).join("/");
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  wrangler([
    "r2",
    "object",
    "put",
    `${t.bucket}/${key}`,
    "--file",
    path,
    "--content-type",
    CONTENT_TYPES[ext] ?? "application/octet-stream",
    ...t.whereFlag,
  ], { quiet: true });
  console.log(`  uploaded  ${key}`);
}

// 4. Rows, parents first (cf.mjs keeps the order), each one replacing any row with its id.
console.log("\nRows");
let total = 0;
for (const table of tables(t)) {
  const file = join(from, "db", `${table}.json`);
  if (!existsSync(file)) {
    console.log(`  ${"—".padStart(6)}  ${table} — not in this export, left alone`);
    continue;
  }
  const rows = JSON.parse(readFileSync(file, "utf8"));
  if (!rows.length) {
    console.log(`  ${String(0).padStart(6)}  ${table}`);
    continue;
  }

  const columns = Object.keys(rows[0]);
  const statements = rows.map(
    (row) =>
      `INSERT OR REPLACE INTO ${ident(table)} (${columns.map(ident).join(", ")}) ` +
      `VALUES (${columns.map((column) => sqlValue(row[column])).join(", ")})`,
  );
  executeBatched(t, statements);
  total += rows.length;
  console.log(`  ${String(rows.length).padStart(6)}  ${table}`);
}

console.log(`\n✓ ${plural(total, "row")} and ${plural(files.length, "file")} written to ${t.db}`);
console.log(`  Now check it: node scripts/verify.mjs --env ${t.env}${t.local ? " --local" : ""} --from ${from}`);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
