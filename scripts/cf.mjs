/**
 * Shared plumbing for the provisioning and backup scripts.
 *
 * Every script here takes the same `--env dev|production [--local]` pair and talks to
 * Cloudflare by shelling out to the wrangler that's already a devDependency — no runtime
 * dependencies, nothing to install, and nothing that can drift from what `npm run
 * cf:deploy` does.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const argv = process.argv.slice(2);

export function flag(name) {
  return argv.includes(name);
}

export function option(name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
}

export function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/** Tables the site doesn't own: wrangler's bookkeeping and SQLite's own. */
export const INTERNAL_TABLES = new Set(["d1_migrations", "sqlite_sequence", "_cf_METADATA", "_cf_KV"]);

/**
 * Parents before children, because D1 enforces the foreign keys: media before the rows
 * that point at it, inquiries before the events and club members created from them.
 * Anything not listed is imported after these, in whatever order it came back.
 */
export const IMPORT_ORDER = [
  "settings",
  "admin_users",
  "media",
  "photo_slots",
  "documents",
  "inquiries",
  "events",
  "club_members",
  "closures",
  "subscribers",
  "revisions",
  "analytics_events",
];

/** Which account, database and bucket a command is aimed at. */
export function target() {
  const env = option("--env", "dev");
  if (!["dev", "production"].includes(env)) {
    fail(`--env must be "dev" or "production" (got "${env}")`);
  }
  const local = flag("--local");
  // --persist-to puts the local database and bucket somewhere other than .wrangler/, which
  // is how a restore can be rehearsed end to end without touching the one you develop against.
  const persist = local ? option("--persist-to", null) : null;
  return {
    env,
    local,
    db: env === "production" ? "bwsll-prod" : "bwsll",
    bucket: env === "production" ? "bwsll-media-prod" : "bwsll-media",
    envFlag: env === "production" ? ["--env", "production"] : [],
    whereFlag: local ? ["--local", ...(persist ? ["--persist-to", persist] : [])] : ["--remote"],
    label: `${env}${local ? (persist ? ` (local, ${persist})` : " (local)") : ""}`,
  };
}

/**
 * wrangler is run as a script under this same node rather than through `npx`, because npx
 * on Windows needs a shell, and a shell re-parses the argument array — which splits a SQL
 * statement on every space. Called this way, arguments arrive exactly as written.
 */
const WRANGLER = join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");

export function wrangler(args, { quiet = false, allowFail = false } = {}) {
  if (!existsSync(WRANGLER)) fail("wrangler isn't installed — run npm install first.");
  try {
    return execFileSync(process.execPath, [WRANGLER, ...args], {
      encoding: "utf8",
      stdio: quiet ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "inherit"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    if (allowFail) return null;
    // wrangler reports some failures on stdout and some on stderr, so show both.
    const detail = [error.stderr, error.stdout].filter(Boolean).join("\n").trim();
    return fail(`wrangler ${args.slice(0, 3).join(" ")} failed:\n${detail || error.message}`);
  }
}

/** Blocks the thread. These scripts are strictly one-thing-at-a-time, so that's fine. */
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** wrangler prints a banner before its JSON, so the parse starts at the first line that opens one. */
export function parseJsonOutput(out, what) {
  if (out === null) return null;
  const match = out.match(/^[[{]/m);
  if (!match) return fail(`${what}: wrangler printed no JSON.\n${out}`);
  try {
    return JSON.parse(out.slice(match.index));
  } catch (error) {
    return fail(`${what}: could not read wrangler's JSON — ${error.message}`);
  }
}

/**
 * Runs one statement and returns its rows.
 *
 * `--command`, not `--file`: a file sent to a *remote* D1 goes through the bulk-import
 * API, which reports how many rows it read and hands back none of them. Reads have to go
 * over the command line, which is safe here because nothing shells out (see above).
 */
export function query(t, sql, { attempts = 3 } = {}) {
  const argv = ["d1", "execute", t.db, ...t.whereFlag, ...t.envFlag, "--command", sql, "--json"];

  // A remote read can fail on its own once — a dropped connection, a busy database. An
  // export that dies at the ninth table of twelve is worse than one that waits a second.
  let out = null;
  for (let attempt = 1; attempt <= attempts && out === null; attempt += 1) {
    out = wrangler(argv, { quiet: true, allowFail: attempt < attempts });
    if (out === null) sleep(1000 * attempt);
  }

  const parsed = parseJsonOutput(out, `query against ${t.db}`) ?? [];
  // One entry per statement, and a summary entry with no rows when D1 adds one — so the
  // rows are the last entry that actually carries a results array.
  const withRows = parsed.filter((entry) => Array.isArray(entry?.results));
  return withRows[withRows.length - 1]?.results ?? [];
}

/** Runs SQL for its effect. Same file trick, no parsing. */
export function execute(t, sql) {
  const file = join(mkdtempSync(join(tmpdir(), "bwsll-")), "run.sql");
  writeFileSync(file, sql, "utf8");
  wrangler(["d1", "execute", t.db, ...t.whereFlag, ...t.envFlag, "--file", file, "--json"], {
    quiet: true,
  });
}

/** The site's own tables, in import order. */
export function tables(t) {
  const rows = query(
    t,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ).map((row) => row.name);
  const owned = rows.filter((name) => !INTERNAL_TABLES.has(name) && !name.startsWith("_cf_"));
  return [
    ...IMPORT_ORDER.filter((name) => owned.includes(name)),
    ...owned.filter((name) => !IMPORT_ORDER.includes(name)),
  ];
}

export function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Uint8Array || Array.isArray(value)) {
    // D1 hands back BLOBs as byte arrays; X'..' is how they go back in.
    return `X'${Buffer.from(value).toString("hex")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

export const ident = (name) => `"${String(name).replace(/"/g, '""')}"`;

/** Long runs of statements go over in batches — one huge file is slower and harder to debug. */
export function executeBatched(t, statements, { size = 100, onBatch } = {}) {
  for (let i = 0; i < statements.length; i += size) {
    execute(t, statements.slice(i, i + size).join(";\n") + ";");
    onBatch?.(Math.min(i + size, statements.length), statements.length);
  }
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
