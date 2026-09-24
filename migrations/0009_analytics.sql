-- Phase 8: a count of the things people do on the site.
--
-- Deliberately thin: a name from a fixed list and the path it happened on. No IP, no
-- user agent, no identifier of any kind — nothing here can be traced back to a person,
-- which is what lets the privacy notice say what it says.

CREATE TABLE IF NOT EXISTS analytics_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  path       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS analytics_name_time ON analytics_events(name, created_at);
