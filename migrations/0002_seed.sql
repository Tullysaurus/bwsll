-- Seed settings (all values JSON-encoded) and the events listed on the current site.

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('announcement',    '"Now open at GEM · 609 E. Pine St., Tulsa"'),
  ('announcement_short', '"Now open at GEM"'),
  ('closure_notice',  '""'),
  ('hours',           '[{"label":"Monday–Saturday","value":"7am–4pm"},{"label":"Sunday","value":"Closed"}]'),
  ('hours_short',     '"Mon–Sat · 7am–4pm"'),
  ('response_time',   '"2 business days"'),
  ('rental_rates',    '{"business":{"g10":"","g20":"","g40":""},"after":{"g10":"","g20":"","g40":""}}');

INSERT INTO events (title, starts_at, ends_at, location, kind, description, published) VALUES
  ('Saturday Scribe', '2026-09-26T10:00', '2026-09-26T12:00', 'Black Tech Street', 'private', NULL, 1),
  ('Live Music', '2026-09-26T18:00', '2026-09-26T21:00', 'Liquid Lounge', 'private', NULL, 1),
  ('Coffee & Conversations — Friendship Church Tulsa', '2026-10-01T18:00', '2026-10-01T19:30', 'Liquid Lounge', 'private', NULL, 1),
  ('Oklahoma Media Center', '2026-10-23T08:00', '2026-10-23T10:00', 'Civic Center', 'catering', NULL, 1),
  ('Coffee & Conversations — Friendship Church Tulsa', '2026-11-05T18:00', '2026-11-05T19:30', 'Liquid Lounge', 'private', NULL, 1);
