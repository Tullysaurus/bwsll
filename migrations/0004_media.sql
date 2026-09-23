-- v2 Phase 3 — files in R2: uploads, photo slots and documents.

-- One row per uploaded file. `key` is content-addressed (media/<sha256>.<ext>), so the
-- same bytes uploaded twice share one R2 object. It is deliberately NOT unique: two
-- slots may need different alt text or credits for the same image, so they get separate
-- rows pointing at the same object. Purging checks for other live rows first.
CREATE TABLE media (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  key          TEXT NOT NULL,
  content_type TEXT NOT NULL,
  bytes        INTEGER NOT NULL,
  width        INTEGER,
  height       INTEGER,
  alt          TEXT,
  credit_text  TEXT,
  credit_url   TEXT,
  uploaded_by  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at   TEXT
);
CREATE INDEX media_key ON media(key);

-- Overrides for the slots declared in src/content/photos.ts. Tone, label and the default
-- alt stay in code; this table only says which image is in a slot. No soft delete —
-- "removing" a photo is setting media_id back to NULL.
CREATE TABLE photo_slots (
  slot_id      TEXT PRIMARY KEY,
  media_id     INTEGER REFERENCES media(id),
  alt_override TEXT
);

-- The PDFs linked from the site. `mode` is only meaningful for the menu: 'auto' builds
-- the PDF from the menu data, 'custom' serves an uploaded file.
CREATE TABLE documents (
  slug       TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  media_id   INTEGER REFERENCES media(id),
  mode       TEXT NOT NULL DEFAULT 'custom' CHECK (mode IN ('custom','auto')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
