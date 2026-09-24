#!/usr/bin/env node
/**
 * Uploads everything in seed/ to R2 and records the matching rows in D1.
 *
 * Idempotent: keys are content hashes, so re-running uploads nothing new and the SQL
 * uses upserts. Shells out to wrangler — no runtime dependencies.
 *
 *   node scripts/seed-files.mjs --env dev
 *   node scripts/seed-files.mjs --env production
 *   node scripts/seed-files.mjs --env dev --local     (local D1 + local R2, for testing)
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { tmpdir } from "node:os";

const args = process.argv.slice(2);
const env = valueOf("--env") ?? "dev";
const local = args.includes("--local");

if (!["dev", "production"].includes(env)) {
  fail(`--env must be "dev" or "production" (got ${env})`);
}

const DB_NAME = env === "production" ? "bwsll-prod" : "bwsll";
const BUCKET = env === "production" ? "bwsll-media-prod" : "bwsll-media";
const envFlag = env === "production" ? ["--env", "production"] : [];
const remoteFlag = local ? ["--local"] : ["--remote"];

const CONTENT_TYPES = {
  ".pdf": "application/pdf",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

/** Documents keep the slugs the public URLs already use. */
const DOCUMENT_TITLES = {
  "liquid-lounge-menu": "Menu",
  "private-event-rental-agreement": "Private event rental agreement",
  "vendor-agreement": "Vendor agreement",
  "food-and-beverage-pricing": "Food & beverage pricing",
  "liquid-love-member-agreement": "Liquid Love member agreement",
  "workforce-trainee-mou": "Workforce trainee MOU",
};

/** Photo files are named after the slot they fill. */
const PHOTO_ALT = {
  "home-gem": "The Greenwood Entrepreneurship at Moton building on Pine Street",
  "visit-exterior": "The GEM entrance on Pine Street",
};

function valueOf(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function wrangler(argv, { quiet = false } = {}) {
  try {
    return execFileSync("npx", ["wrangler", ...argv], {
      encoding: "utf8",
      stdio: quiet ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "inherit"],
      shell: process.platform === "win32",
    });
  } catch (error) {
    fail(`wrangler ${argv.slice(0, 3).join(" ")} failed:\n${error.stderr || error.message}`);
  }
}

const sqlEscape = (value) =>
  value === null || value === undefined ? "NULL" : `'${String(value).replace(/'/g, "''")}'`;

/**
 * Runs SQL from a temp file rather than `--command`. On Windows `npx` has to go through
 * the shell, which re-parses the argument array and would split multi-line SQL on every
 * space.
 */
function d1(sql) {
  const file = join(mkdtempSync(join(tmpdir(), "bwsll-seed-")), "seed.sql");
  writeFileSync(file, sql, "utf8");
  return wrangler(["d1", "execute", DB_NAME, ...remoteFlag, ...envFlag, "--file", file, "--json"], {
    quiet: true,
  });
}

function objectExists(key) {
  try {
    execFileSync("npx", ["wrangler", "r2", "object", "get", `${BUCKET}/${key}`, ...remoteFlag, "--pipe"], {
      stdio: ["ignore", "ignore", "ignore"],
      shell: process.platform === "win32",
    });
    return true;
  } catch {
    return false;
  }
}

function upload(file, key, contentType) {
  if (objectExists(key)) return false;
  wrangler([
    "r2",
    "object",
    "put",
    `${BUCKET}/${key}`,
    "--file",
    file,
    "--content-type",
    contentType,
    ...remoteFlag,
  ]);
  return true;
}

function collect(dir, prefix) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => CONTENT_TYPES[extname(name).toLowerCase()])
    .map((name) => {
      const path = join(dir, name);
      const bytes = readFileSync(path);
      const contentType = CONTENT_TYPES[extname(name).toLowerCase()];
      const hash = createHash("sha256").update(bytes).digest("hex");
      const ext = contentType === "application/pdf" ? "pdf" : extname(name).slice(1).toLowerCase();
      return {
        path,
        name,
        slug: basename(name, extname(name)),
        contentType,
        size: bytes.length,
        key: `${prefix}/${hash}.${ext}`,
      };
    });
}

console.log(`Seeding ${env}${local ? " (local)" : ""} → db ${DB_NAME}, bucket ${BUCKET}\n`);

/**
 * Fonts go to fixed keys rather than content-addressed ones: the PDF builder asks for
 * `fonts/menu-display.ttf` by name, and a new version should replace the old file.
 */
const FONTS = ["menu-display.ttf", "menu-body.ttf"];

const documents = collect(join("seed", "files"), "files");
const photos = collect(join("seed", "photos"), "media");

if (documents.length === 0 && photos.length === 0) fail("Nothing in seed/files or seed/photos");

for (const name of FONTS) {
  const path = join("seed", "fonts", name);
  if (!existsSync(path)) {
    console.log(`  missing        seed/fonts/${name} — the menu PDF will use a standard face`);
    continue;
  }
  wrangler([
    "r2",
    "object",
    "put",
    `${BUCKET}/fonts/${name}`,
    "--file",
    path,
    "--content-type",
    "font/ttf",
    ...remoteFlag,
  ]);
  console.log(`  uploaded       ${name} → fonts/${name}`);
}

for (const file of [...documents, ...photos]) {
  const uploaded = upload(file.path, file.key, file.contentType);
  console.log(`  ${uploaded ? "uploaded" : "already there"}  ${file.name} → ${file.key}`);
}

// One statement per file, each an upsert, so re-running changes nothing.
const statements = [];

for (const doc of documents) {
  const title = DOCUMENT_TITLES[doc.slug] ?? doc.slug;
  statements.push(
    `INSERT INTO media (key, content_type, bytes, alt, uploaded_by)
     SELECT ${sqlEscape(doc.key)}, ${sqlEscape(doc.contentType)}, ${doc.size}, ${sqlEscape(title)}, 'seed'
     WHERE NOT EXISTS (SELECT 1 FROM media WHERE key = ${sqlEscape(doc.key)} AND deleted_at IS NULL)`,
    `INSERT INTO documents (slug, title, media_id, mode, updated_at)
     VALUES (${sqlEscape(doc.slug)}, ${sqlEscape(title)},
             (SELECT id FROM media WHERE key = ${sqlEscape(doc.key)} AND deleted_at IS NULL ORDER BY id LIMIT 1),
             'custom', datetime('now'))
     ON CONFLICT(slug) DO UPDATE SET
       media_id = COALESCE(documents.media_id, excluded.media_id),
       title = excluded.title`,
  );
}

for (const photo of photos) {
  const alt = PHOTO_ALT[photo.slug] ?? photo.slug.replace(/-/g, " ");
  statements.push(
    `INSERT INTO media (key, content_type, bytes, alt, uploaded_by)
     SELECT ${sqlEscape(photo.key)}, ${sqlEscape(photo.contentType)}, ${photo.size}, ${sqlEscape(alt)}, 'seed'
     WHERE NOT EXISTS (SELECT 1 FROM media WHERE key = ${sqlEscape(photo.key)} AND deleted_at IS NULL)`,
    `INSERT INTO photo_slots (slot_id, media_id)
     VALUES (${sqlEscape(photo.slug)},
             (SELECT id FROM media WHERE key = ${sqlEscape(photo.key)} AND deleted_at IS NULL ORDER BY id LIMIT 1))
     ON CONFLICT(slot_id) DO UPDATE SET media_id = COALESCE(photo_slots.media_id, excluded.media_id)`,
  );
}

d1(statements.join(";\n") + ";");

console.log(`\n✓ ${documents.length} document(s), ${photos.length} photo(s) recorded in ${DB_NAME}`);
console.log("  Re-running is safe — keys are content hashes and every write is an upsert.");
