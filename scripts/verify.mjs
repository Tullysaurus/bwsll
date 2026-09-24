#!/usr/bin/env node
/**
 * Checks that a deployed site is actually whole: schema applied, rows present, every file
 * a row points at really in the bucket, no placeholder config left, secrets set.
 *
 *   node scripts/verify.mjs --env production
 *   node scripts/verify.mjs --env dev --from backup/bwsll-2026-09-23T...   (compare counts)
 *   node scripts/verify.mjs --env dev --local
 *
 * Exits non-zero if anything failed, so it can gate a launch. The first check is the one
 * that has already bitten this project once: code deployed ahead of its migrations, which
 * shows up as a 500 on whichever admin page reads the new column.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { flag, option, plural, query, target, wrangler } from "./cf.mjs";

const FONT_KEYS = ["fonts/menu-display.ttf", "fonts/menu-body.ttf"];
const PUBLIC_PATHS = ["/", "/menu", "/visit", "/robots.txt", "/sitemap.xml"];

const t = target();
const from = option("--from", null);
const skipFetch = flag("--no-fetch");

let failures = 0;
let warnings = 0;

const pass = (message) => console.log(`  ok    ${message}`);
const warn = (message) => {
  warnings += 1;
  console.log(`  note  ${message}`);
};
const bad = (message) => {
  failures += 1;
  console.log(`  FAIL  ${message}`);
};

console.log(`Verifying ${t.label} — database ${t.db}, bucket ${t.bucket}\n`);

// 1. Schema ------------------------------------------------------------------
console.log("Migrations");
const onDisk = readdirSync("migrations")
  .filter((name) => name.endsWith(".sql"))
  .sort();
const applied = query(t, "SELECT name FROM d1_migrations ORDER BY id").map((row) => row.name);
const pending = onDisk.filter((name) => !applied.includes(name));

if (!applied.length) {
  bad(`${t.db} has no schema at all — run the migrations.`);
} else if (pending.length) {
  bad(
    `${plural(pending.length, "migration")} not applied: ${pending.join(", ")}.` +
      "\n        Admin pages that read the new columns return 500 until they are.",
  );
} else {
  pass(`all ${onDisk.length} applied`);
}

// 2. Rows --------------------------------------------------------------------
console.log("\nRows");
const manifest = from ? JSON.parse(readFileSync(join(from, "manifest.json"), "utf8")) : null;
const expected = manifest?.tables ?? null;
const names = expected
  ? Object.keys(expected)
  : ["settings", "events", "inquiries", "media", "documents", "photo_slots", "subscribers"];

const counts = {};
for (const table of names) {
  const [row] = query(t, `SELECT COUNT(*) AS n FROM "${table}"`);
  counts[table] = Number(row?.n ?? 0);
}

if (expected) {
  for (const [table, want] of Object.entries(expected)) {
    const got = counts[table] ?? 0;
    if (got === want) pass(`${table}: ${got}`);
    else if (got > want) warn(`${table}: ${got}, the export had ${want} — newer rows since then?`);
    else bad(`${table}: ${got}, the export had ${want} — ${plural(want - got, "row")} missing`);
  }
} else {
  for (const [table, n] of Object.entries(counts)) {
    if (table === "settings" && n === 0) bad("settings is empty — the seed migration hasn't run");
    else pass(`${table}: ${n}`);
  }
}

// 3. Files -------------------------------------------------------------------
// Every uploaded file has a media row, so the table is the list of what must be there.
console.log("\nFiles in R2");
const keys = query(t, "SELECT key FROM media WHERE deleted_at IS NULL ORDER BY id").map(
  (row) => row.key,
);
let found = 0;
for (const key of keys) {
  if (objectExists(key)) found += 1;
  else bad(`missing: ${key} — a page is showing a broken file`);
}
if (keys.length) pass(`${found} of ${keys.length} media files present`);
else warn("no media rows — has seed:files been run?");

for (const key of FONT_KEYS) {
  if (!objectExists(key)) warn(`${key} not uploaded — the menu PDF falls back to a standard face`);
}

// 4. Configuration -----------------------------------------------------------
console.log("\nConfiguration");
const vars = varsFor(t.env);
const placeholders = Object.entries(vars).filter(([, value]) =>
  String(value).startsWith("REPLACE_WITH"),
);
if (placeholders.length) {
  bad(`placeholders still in wrangler.jsonc: ${placeholders.map(([key]) => key).join(", ")}`);
} else {
  pass("no placeholder values left in wrangler.jsonc");
}

if (!String(vars.OWNER_EMAILS ?? "").includes("@")) {
  bad("OWNER_EMAILS is empty — nobody could sign in if the team table were emptied");
} else {
  pass(`OWNER_EMAILS: ${vars.OWNER_EMAILS}`);
}
if (!t.local && String(vars.SITE_URL ?? "").includes("localhost")) {
  bad(`SITE_URL is ${vars.SITE_URL} — canonical tags and the sitemap would point at a laptop`);
}

// Secrets belong to a deployed Worker, so a --local run has nothing to look at: the
// equivalents live in .dev.vars, which never leaves the machine.
if (t.local) {
  warn("secrets aren't part of a local run — check .dev.vars for RESEND_API_KEY and TURNSTILE_SECRET");
} else {
  const secretList = wrangler(["secret", "list", ...t.envFlag, "--format", "json"], {
    quiet: true,
    allowFail: true,
  });
  const secrets = JSON.parse(secretList?.match(/\[[\s\S]*\]/)?.[0] ?? "[]").map((row) => row.name);
  for (const name of ["RESEND_API_KEY", "TURNSTILE_SECRET"]) {
    if (secrets.includes(name)) pass(`${name} is set`);
    else bad(`${name} is not set — ${name === "RESEND_API_KEY" ? "no inquiry emails" : "every form rejects"}`);
  }
}

// 5. The live site -----------------------------------------------------------
if (!t.local && !skipFetch && vars.SITE_URL) {
  console.log(`\n${vars.SITE_URL}`);
  for (const path of PUBLIC_PATHS) {
    try {
      const response = await fetch(`${vars.SITE_URL}${path}`, { redirect: "manual" });
      if (response.ok) pass(`${path} → ${response.status}`);
      else bad(`${path} → ${response.status}`);
    } catch (error) {
      warn(`${path} → ${error.message} (offline, or DNS isn't pointed here yet)`);
    }
  }

  // /admin must not hand a page to someone Cloudflare Access hasn't challenged.
  try {
    const response = await fetch(`${vars.SITE_URL}/admin`, { redirect: "manual" });
    const body = response.ok ? await response.text() : "";
    if (body.includes("dev@localhost")) {
      bad("/admin served the development bypass — look for a stray .env file and rebuild");
    } else if (response.status >= 300 && response.status < 400) {
      pass(`/admin → ${response.status} (Access challenge)`);
    } else {
      warn(`/admin → ${response.status} — confirm by hand that it asks you to sign in`);
    }
  } catch (error) {
    warn(`/admin → ${error.message}`);
  }
}

console.log(`\n${failures ? "FAILED" : "OK"} — ${plural(failures, "failure")}, ${plural(warnings, "note")}`);
process.exit(failures ? 1 : 0);

function objectExists(key) {
  return (
    wrangler(["r2", "object", "get", `${t.bucket}/${key}`, "--pipe", ...t.whereFlag], {
      quiet: true,
      allowFail: true,
    }) !== null
  );
}

/** wrangler.jsonc, read the way a deploy reads it: top level is dev, env.production overrides. */
function varsFor(env) {
  const config = JSON.parse(stripComments(readFileSync("wrangler.jsonc", "utf8")));
  return env === "production" ? (config.env?.production?.vars ?? {}) : (config.vars ?? {});
}

/** Comments, but only outside strings — half the values in there are URLs with "//" in them. */
function stripComments(text) {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      out += char;
      if (char === "\\") {
        out += text[i + 1] ?? "";
        i += 1;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }
    if (char === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      out += "\n";
      continue;
    }
    if (char === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 1;
      continue;
    }
    out += char;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}
