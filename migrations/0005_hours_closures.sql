-- Phase 4: structured opening hours and dated closures.
--
-- The free-text `hours` rows and the `hours_short` line they fed are replaced by the
-- `hours_week` setting (a day-by-day structure) and the label generator in
-- `src/lib/hours.ts`. Free text can't be parsed back into times, so the old rows are
-- dropped and the code defaults take over until the owner saves the hours screen once.

CREATE TABLE IF NOT EXISTS closures (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date TEXT NOT NULL,             -- YYYY-MM-DD, America/Chicago
  end_date   TEXT NOT NULL,
  closed     INTEGER NOT NULL DEFAULT 1,
  open_time  TEXT,                      -- HH:MM, only when closed = 0
  close_time TEXT,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS closures_range ON closures(start_date, end_date);

DELETE FROM settings WHERE key IN ('hours', 'hours_short');
