-- Phase 7: the people who joined the Liquid Love Club.
--
-- `end_date` is stored because a membership can be cancelled or extended, but the date
-- perks begin is *computed* (start + two months) rather than stored: the fine print can
-- change, and a stored date would go stale the moment it did.

CREATE TABLE IF NOT EXISTS club_members (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  status     TEXT NOT NULL CHECK (status IN ('pending','active','expired','cancelled')),
  start_date TEXT,
  end_date   TEXT,
  pay_link   TEXT,
  notes      TEXT,
  inquiry_id INTEGER NULL REFERENCES inquiries(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS club_members_status ON club_members(status, end_date);
