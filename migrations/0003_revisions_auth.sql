-- v2 Phase 2 — revision history, soft delete, and admin authorization.

-- Every admin write records a snapshot of the record as it stands after the change.
-- `entity_id` is TEXT so it holds both integer row ids and settings keys.
CREATE TABLE revisions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('create','update','delete','restore')),
  snapshot    TEXT NOT NULL,
  user_email  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX revisions_entity ON revisions(entity_type, entity_id, created_at);

-- Who may use /admin. Cloudflare Access proves identity; this table grants access.
-- Emails in the OWNER_EMAILS var are always owners, so a fresh deploy can get in.
CREATE TABLE admin_users (
  email      TEXT PRIMARY KEY,
  role       TEXT NOT NULL CHECK (role IN ('owner','staff')),
  active     INTEGER NOT NULL DEFAULT 1,
  added_by   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Soft delete. Every public and admin read filters `deleted_at IS NULL`; only Trash
-- looks past it. Adding the column to `inquiries` here keeps migration 0007 focused on
-- the CHECK rebuild it actually needs.
ALTER TABLE events      ADD COLUMN deleted_at TEXT;
ALTER TABLE inquiries   ADD COLUMN deleted_at TEXT;
ALTER TABLE subscribers ADD COLUMN deleted_at TEXT;
