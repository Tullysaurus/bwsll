-- Black Wall Street Liquid Lounge — initial schema

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL            -- JSON-encoded
);

CREATE TABLE events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  starts_at   TEXT NOT NULL,     -- ISO 8601 local time, America/Chicago
  ends_at     TEXT,
  location    TEXT NOT NULL DEFAULT 'Liquid Lounge',
  kind        TEXT NOT NULL CHECK (kind IN ('public','private','catering')),
  description TEXT,
  published   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX events_starts ON events(starts_at);

CREATE TABLE inquiries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL CHECK (type IN ('event','catering','club','vendor','workforce','contact')),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  data        TEXT NOT NULL,     -- JSON: all type-specific fields + estimate snapshot
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','replied','booked','closed')),
  notes       TEXT,              -- owner's private notes
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX inquiries_status ON inquiries(status, created_at);

CREATE TABLE subscribers (
  email      TEXT PRIMARY KEY,
  source     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
