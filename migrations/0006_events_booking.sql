-- Phase 6: events know whether they occupy the room, and where they came from.
--
-- `uses_space` is what availability is computed from: an off-site catering job doesn't
-- block the room, a private booking does. Existing rows are backfilled from `kind`,
-- which is the same rule the site has been applying implicitly.

ALTER TABLE events ADD COLUMN uses_space INTEGER NOT NULL DEFAULT 1;
ALTER TABLE events ADD COLUMN hide_title INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN inquiry_id INTEGER NULL REFERENCES inquiries(id);

UPDATE events SET uses_space = 0 WHERE kind = 'catering';

-- `hide_title` is deliberately NOT backfilled: events already on the calendar were
-- published with the titles the owner chose, and rewriting them to "Private event"
-- would take away wording that is already public. New private bookings default to
-- hidden in the admin form instead, where it can be seen and unticked.

CREATE INDEX IF NOT EXISTS events_space ON events(uses_space, starts_at);
