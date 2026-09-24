#!/usr/bin/env node
/**
 * Stands the site up in a Cloudflare account that has never seen it: creates the D1
 * database and the R2 bucket, writes the database id into wrangler.jsonc, applies the
 * migrations, and uploads the seed files.
 *
 *   node scripts/provision.mjs --env production
 *   node scripts/provision.mjs --env dev          (a second dev account, e.g. a rehearsal)
 *   node scripts/provision.mjs --env production --dry-run
 *
 * Safe to re-run: it finds what already exists and skips it. What it can't do for you is
 * the half that lives in the dashboard — Turnstile, Access, Resend and the custom domain.
 * It prints those at the end, in order, with the values it still needs.
 *
 * Everything it does is `npx wrangler` against whichever account you're logged into, so
 * check that first: `npx wrangler whoami`.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fail, flag, parseJsonOutput, target, wrangler } from "./cf.mjs";

const t = target();
const dryRun = flag("--dry-run");

if (t.local) fail("--local doesn't apply here: provisioning creates things in a real account.");

const step = (message) => console.log(`\n${message}`);
const done = (message) => console.log(`  ✓ ${message}`);
const skip = (message) => console.log(`  · ${message}`);

const who = parseJsonOutput(
  wrangler(["whoami", "--json"], { quiet: true, allowFail: true }) ?? "",
  "whoami",
);
console.log(`Provisioning ${t.env} — database ${t.db}, bucket ${t.bucket}`);
console.log(`  account: ${who?.account_name ?? who?.email ?? "unknown (run: npx wrangler login)"}`);
if (dryRun) console.log("  dry run — nothing will be created");

// 1. D1 ----------------------------------------------------------------------
step("D1 database");
const existing = (parseJsonOutput(wrangler(["d1", "list", "--json"], { quiet: true }), "d1 list") ?? [])
  .find((row) => row.name === t.db);

let databaseId = existing?.uuid ?? existing?.database_id ?? null;
if (databaseId) {
  skip(`${t.db} already exists (${databaseId})`);
} else if (dryRun) {
  skip(`would create ${t.db}`);
} else {
  const out = wrangler(["d1", "create", t.db], { quiet: true });
  databaseId = out.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0] ?? null;
  if (!databaseId) fail(`created ${t.db} but couldn't read its id from wrangler's output:\n${out}`);
  done(`created ${t.db} (${databaseId})`);
}

// 2. wrangler.jsonc ----------------------------------------------------------
// Replacing the placeholder rather than rewriting the file: it's JSONC, and the comments
// in it are the documentation for the block being edited.
step("wrangler.jsonc");
const PLACEHOLDER = "REPLACE_WITH_PROD_D1_DATABASE_ID";
const config = readFileSync("wrangler.jsonc", "utf8");
if (!databaseId) {
  skip("no id yet (dry run)");
} else if (t.env === "production" && config.includes(PLACEHOLDER)) {
  if (dryRun) skip(`would write ${databaseId} into env.production.d1_databases`);
  else {
    writeFileSync("wrangler.jsonc", config.replace(PLACEHOLDER, databaseId), "utf8");
    done(`wrote the database id into env.production`);
  }
} else if (config.includes(databaseId)) {
  skip("the id in wrangler.jsonc is already this database");
} else {
  console.log(
    `  ! wrangler.jsonc points at a different database.\n` +
      `    Put ${databaseId} in ${t.env === "production" ? "env.production." : ""}d1_databases[0].database_id yourself —\n` +
      `    overwriting an id that isn't a placeholder is not this script's call to make.`,
  );
}

// 3. R2 ----------------------------------------------------------------------
step("R2 bucket");
const buckets = wrangler(["r2", "bucket", "list"], { quiet: true }) ?? "";
if (buckets.includes(t.bucket)) {
  skip(`${t.bucket} already exists`);
} else if (dryRun) {
  skip(`would create ${t.bucket}`);
} else {
  wrangler(["r2", "bucket", "create", t.bucket], { quiet: true });
  done(`created ${t.bucket}`);
}

// 4. Schema and seed files ---------------------------------------------------
step("Migrations");
if (dryRun) {
  skip(`would apply every migration to ${t.db}`);
} else {
  wrangler(["d1", "migrations", "apply", t.db, "--remote", ...t.envFlag]);
  done("applied");
}

step("Seed files");
if (dryRun) {
  skip("would upload seed/files, seed/photos and seed/fonts");
} else {
  execFileSync("node", ["scripts/seed-files.mjs", "--env", t.env], { stdio: "inherit" });
}

// 5. What a script can't do --------------------------------------------------
console.log(`
Done with everything that can be automated. The rest is in the dashboard — DEPLOY.md has
the detail, this is the order:

  1. Turnstile → add a widget for the site's domain (Managed).
       site key   → wrangler.jsonc ${t.env === "production" ? "env.production." : ""}vars.TURNSTILE_SITE_KEY
       secret key → npx wrangler secret put TURNSTILE_SECRET${t.env === "production" ? " --env production" : ""}
  2. Resend → verify the notify. subdomain, then
       npx wrangler secret put RESEND_API_KEY${t.env === "production" ? " --env production" : ""}
  3. Zero Trust → Access → self-hosted app for path "admin", and a second for "api/admin".
       team domain → vars.CF_ACCESS_TEAM_DOMAIN
       AUD tag     → vars.CF_ACCESS_AUD
  4. vars.OWNER_EMAILS → the owner's email address, comma-separated for more than one.
       This is the account that can always sign in, even with an empty team table.
  5. npm run cf:deploy${t.env === "production" ? ":prod" : ""}
  6. Workers & Pages → the Worker → Custom domains → add the domain.
  7. node scripts/verify.mjs --env ${t.env}

To move an existing site's content across, export from the old account first and import
here — both scripts are next to this one, and verify compares the two.
`);
