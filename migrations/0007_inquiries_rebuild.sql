-- Phase 7: `partner` becomes an inquiry type, and an inquiry can carry its payments.
--
-- SQLite can't alter a CHECK constraint, so the table is rebuilt. Two things make that
-- safe to run: ids are carried over explicitly (events and club members reference them),
-- and `inquiries_status` is recreated afterwards — dropping the old table takes its
-- indexes with it, which is the trap in this kind of migration.

PRAGMA foreign_keys = off;

CREATE TABLE inquiries_new (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT NOT NULL CHECK (type IN ('event','catering','club','vendor','partner','workforce','contact')),
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  data         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','replied','booked','closed')),
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at   TEXT,
  -- Payments are recorded, never taken: the link is whatever the owner sends (Square,
  -- an invoice), and the two flags are ticked by hand when the money arrives.
  pay_link     TEXT,
  deposit_paid INTEGER NOT NULL DEFAULT 0,
  balance_paid INTEGER NOT NULL DEFAULT 0
);

INSERT INTO inquiries_new (id, type, name, email, phone, data, status, notes, created_at, deleted_at)
SELECT id, type, name, email, phone, data, status, notes, created_at, deleted_at FROM inquiries;

DROP TABLE inquiries;
ALTER TABLE inquiries_new RENAME TO inquiries;

CREATE INDEX inquiries_status ON inquiries(status, created_at);

PRAGMA foreign_keys = on;
