# Liquid Lounge v2 — implementation plan

Phase 1 deliverable. No code has been written. Read §1 first — it's the only part that
needs a decision from you before Phase 2 can start.

Grounded in the v1 codebase as it stands on 2026-09-23 (commit-in-progress: v1 site +
admin + credit mechanism, `home-gem` and `visit-exterior` photos wired by hand).

---

## 1. Decisions needed before Phase 2

### 1.1 `DEFAULT_NEW_USER_ROLE` — I think this should be `staff`, not `owner`

The spec sets it to `owner` (§3.2). Combined with the Access policy change to
**Include: Everyone** (§3.3), the practical posture becomes: *any email the owner types
into the Team page gets full owner rights*, including the ability to read and export
**workforce inquiries** — which §3.2 itself singles out as owner-only precisely because
applicants can be minors.

The staff/owner split is the mechanism that protects that data, and defaulting to `owner`
switches it off for everyone who is ever added. I'd default to `staff` and let the owner
promote deliberately. It's the same one-line constant either way.

**Tell me which you want.** I'll implement `owner` as written if you've a reason —
but I don't want to ship minors' data behind a default that nullifies its own control.

### 1.2 Cloudflare Workers plan on the client's account

The deployed bundle is currently **1.20 MB gzipped** (measured:
`.open-next/server-functions/default/handler.mjs`). The free plan caps a Worker at 3 MB
gzipped; paid is 10 MB. Adding `pdf-lib` + `@pdf-lib/fontkit` for the menu PDF (§4.6) is
roughly +0.4–0.5 MB gzipped, landing near 1.7 MB.

That fits on free, but the margin isn't huge and R2 requires a paid plan anyway
(R2 has its own free tier but needs a card on file). **Is the client's account going to be
on Workers Paid?** If it must stay free, I'd move menu-PDF generation out of the Worker
(generate on save in the admin, store the result in R2) rather than shipping `pdf-lib` in
the request path.

### 1.3 Where do SPEC.md and this v2 spec live?

Neither is in the repo. `CLAUDE.md` is just `@AGENTS.md`, and code comments reference
`§4.4`, `§5.3` etc. against a document that doesn't exist here. After handoff there's no
developer, so the specs should travel with the code.

Proposal: commit them as `docs/SPEC-v1.md` and `docs/SPEC-v2.md`, and point `CLAUDE.md`
at both. **Paste me the v1 spec** (I have it from our session but not as a file) or tell
me to reconstruct it.

---

## 2. Corrections to the spec

These are places where the spec's assumption doesn't match the code. I've planned around
them; flagging so you can correct me if I've read your intent wrong.

| § | Spec says | Actually |
|---|---|---|
| 4.5 | Remove `instagramHandle` "wherever it's used only for that section" | It's **also** used in the home page's empty-events message (`(home)/page.tsx:152`, "follow @BWStLiquidLounge for updates") and in `copy.ts` → `events.empty`. It stays, as an editable business field. Only the strip goes. |
| 4 | Components to switch to getters: `SiteFooter`, `InfoStrip`, `visit`, `jsonld.ts`, `email.ts`, layout metadata | Also **`LegalPage.tsx`**, which imports the `lastUpdated` value from `content/legal.ts`. `MenuTable` and `SignatureGrid` import *types only* — no change needed. `SiteHeader`/`MobileNav` import `nav`, which §4.1 says stays in code, so they only need the Order-ahead URL passed as a prop. |
| 2.2 | `mutate()` does the write and the revision "in one `db.batch()`" | Works for update/delete/restore. **Creates can't**, because the new id isn't known when the batch is built. See §5.1 for the fix I propose. |
| 2.1 | `deleted_at` on "every new content table" | Meaningless on `photo_slots` and `documents` — they're keyed config rows where "delete" is just nulling `media_id`, and a soft-deleted row would block the PK on re-create. I'd add `deleted_at` to `media`, `closures`, `club_members` only. |
| 2.1 | Rebuild `inquiries` to add the `partner` CHECK | Correct — and the rebuild **drops `inquiries_status`**, which must be recreated in the same migration. Same trap doesn't apply to `events` (adding columns is a plain `ALTER TABLE`). |
| 9 | Tests use `better-sqlite3` (dev dependency) | Unnecessary. **`node:sqlite` works today** on your Node 22.22.2 with no flag (verified), avoiding a native module that would also need adding to `allowScripts` and a Windows toolchain. I'll use `node:sqlite` and keep `better-sqlite3` as a fallback only if it bites. |
| 4.4 | Server actions have a "~1 MB default body limit" | Confirmed in `node_modules/next/dist/docs/01-app/02-guides/server-actions.md:83`. Route handler for uploads is right. |
| 8.1 | `opennextjs-cloudflare deploy --env production` | Confirmed: `-e, --env` is supported by the CLI. |

**Also true and worth stating:** no client component imports `PhotoSlot` (verified), so
making it an async server component is safe.

---

## 3. Final schema

Existing tables keep their current columns; additions are marked **+**.

```sql
-- unchanged in shape, additive only
settings(key TEXT PK, value TEXT)                    -- JSON-encoded; gains many new keys

events(
  id INTEGER PK AUTOINCREMENT, title, starts_at, ends_at, location,
  kind CHECK(public|private|catering), description, published, created_at,
+ uses_space INTEGER NOT NULL DEFAULT 1,
+ hide_title INTEGER NOT NULL DEFAULT 0,
+ inquiry_id INTEGER NULL REFERENCES inquiries(id),
+ deleted_at TEXT NULL
)

inquiries(                                            -- REBUILT (CHECK change)
  id INTEGER PK AUTOINCREMENT,
  type CHECK(event|catering|club|vendor|workforce|contact
+          |partner),
  name, email, phone, data TEXT, status, notes, created_at,
+ pay_link TEXT NULL,
+ deposit_paid INTEGER NOT NULL DEFAULT 0,
+ balance_paid INTEGER NOT NULL DEFAULT 0,
+ deleted_at TEXT NULL
)

subscribers(email TEXT PK, source, created_at,
+ deleted_at TEXT NULL)

-- new
revisions(
  id INTEGER PK AUTOINCREMENT,
  entity_type TEXT NOT NULL,        -- 'event' | 'inquiry' | 'setting' | 'media' | ...
  entity_id   TEXT NOT NULL,        -- TEXT so it holds both ids and setting keys
  action      TEXT NOT NULL CHECK(action IN ('create','update','delete','restore')),
  snapshot    TEXT NOT NULL,        -- JSON of the full record AFTER the action
  user_email  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
)
CREATE INDEX revisions_entity ON revisions(entity_type, entity_id, created_at);

admin_users(
  email TEXT PK,                    -- stored lowercase
  role TEXT NOT NULL CHECK(role IN ('owner','staff')),
  active INTEGER NOT NULL DEFAULT 1,
  added_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)

media(
  id INTEGER PK AUTOINCREMENT,
  key TEXT NOT NULL,                -- R2 key, content-addressed; NOT unique (see §6.3)
  content_type TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  width INTEGER, height INTEGER,    -- NULL for PDFs
  alt TEXT, credit_text TEXT, credit_url TEXT,
  uploaded_by TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT NULL
)
CREATE INDEX media_key ON media(key);

photo_slots(                        -- no deleted_at: config, not content
  slot_id TEXT PK,                  -- matches ids in content/photos.ts
  media_id INTEGER NULL REFERENCES media(id),
  alt_override TEXT NULL
)

documents(                          -- no deleted_at
  slug TEXT PK,                     -- 'private-event-rental-agreement', ...
  title TEXT NOT NULL,
  media_id INTEGER NULL REFERENCES media(id),
  mode TEXT NOT NULL DEFAULT 'custom' CHECK(mode IN ('custom','auto')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)

closures(
  id INTEGER PK AUTOINCREMENT,
  start_date TEXT NOT NULL,         -- YYYY-MM-DD, America/Chicago
  end_date TEXT NOT NULL,
  closed INTEGER NOT NULL DEFAULT 1,
  open_time TEXT, close_time TEXT,  -- HH:MM when closed = 0
  note TEXT,
  deleted_at TEXT NULL
)
CREATE INDEX closures_range ON closures(start_date, end_date);

club_members(
  id INTEGER PK AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending','active','expired','cancelled')),
  start_date TEXT, end_date TEXT, pay_link TEXT, notes TEXT,
  inquiry_id INTEGER NULL REFERENCES inquiries(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT NULL
)
CREATE INDEX club_members_status ON club_members(status, end_date);

analytics_events(
  id INTEGER PK AUTOINCREMENT,
  name TEXT NOT NULL,               -- allowlisted
  path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
CREATE INDEX analytics_name_time ON analytics_events(name, created_at);
```

`club_members.end_date` is stored, and **"Perks start" is computed** (start_date + 2
months) rather than stored, so a change to the fine print doesn't strand stale values.

### 3.1 New settings keys

All JSON-encoded, all defaulted from `src/content/*`:

| Key | Shape | Replaces |
|---|---|---|
| `business` | partial of `content/business.ts` | — |
| `hours` | `{ mon: {closed}\|{open,close}, … }` | free-text `hours` rows |
| `ordering` | `{ orderAhead, doordash, ubereats }` | — |
| `copy.home`, `copy.club`, `copy.about`, … | partial of each `content/copy.ts` export | — |
| `legal.privacy`, `legal.terms` | `LegalSection[]` | — |
| `menu` | whole menu document | `content/menu.ts` |
| `catering` | packages, multipliers, notes, `goodToKnow`, rental rows + rates, estimator defaults | `content/catering.ts`, `rental_rates` |
| `booking_rules` | windows per weekday, min/max duration, buffer, horizon, notice | — |
| `impact_numbers` | `{label,value}[]` | — |

**Retired:** `hours_short`, `closure_notice`, `rental_rates` (all migrated forward).

---

## 4. Migrations

Seven new files. `0001`/`0002` untouched.

| File | Phase | Contents |
|---|---|---|
| `0003_revisions_auth.sql` | 2 | `revisions`, `admin_users`, `deleted_at` on `events`/`subscribers` |
| `0004_media.sql` | 3 | `media`, `photo_slots`, `documents` |
| `0005_hours_closures.sql` | 4 | `closures`; convert free-text `hours` → structured; migrate `closure_notice` → a closure row; drop retired keys |
| `0006_events_booking.sql` | 6 | `events.uses_space` / `hide_title` / `inquiry_id`; backfill `uses_space = 0` where `kind='catering'`, else 1 |
| `0007_inquiries_rebuild.sql` | 7 | **table rebuild** for the `partner` CHECK + `pay_link`/`deposit_paid`/`balance_paid`/`deleted_at`; preserve ids; **recreate `inquiries_status`** |
| `0008_club.sql` | 7 | `club_members` |
| `0009_analytics.sql` | 8 | `analytics_events` |

The `0007` rebuild runs `PRAGMA foreign_keys=off` → create `inquiries_new` → `INSERT
INTO inquiries_new SELECT id, …` → drop → rename → recreate index. Because `events.inquiry_id`
and `club_members.inquiry_id` reference `inquiries`, `0007` must run **after** `0006` and
**before** `0008`, which the numbering gives us.

---

## 5. Core mechanisms

### 5.1 `mutate()` and the entity registry

One registry in `src/lib/entities.ts` drives revisions, History, Trash and Restore:

```ts
const ENTITIES = {
  event: { table: "events", idColumn: "id", columns: [...], label: (row) => row.title },
  inquiry: { table: "inquiries", idColumn: "id", columns: [...], label: ... },
  // setting is special-cased: entity_id = key, snapshot = the value
} as const;
```

`src/lib/revisions.ts` exposes `mutate()`, which builds a `db.batch()` of:

1. the write statement(s), then
2. `INSERT INTO revisions (...) SELECT ?, CAST(id AS TEXT), ?, json_object(<columns>), ? FROM <table> WHERE id = <target>`

where `<target>` is the known id for update/delete/restore, and **`last_insert_rowid()`**
for creates. D1's `batch()` runs sequentially in one implicit transaction on one
connection, so `last_insert_rowid()` should resolve to the row the previous statement
inserted — which keeps creates atomic too, and solves the gap flagged in §2.

**This is the single riskiest assumption in the plan.** First task of Phase 2 is a
throwaway script that proves `last_insert_rowid()` behaves inside `db.batch()` on real
D1 (local and remote). If it doesn't, the fallback is `INSERT … RETURNING id` followed by
a second statement, accepting non-atomic revisions on create only — and I'll tell you
before proceeding.

Restore is generic: read `snapshot`, `INSERT … ON CONFLICT(id) DO UPDATE SET …` every
registered column, then record a `restore` revision.

### 5.2 Soft delete — one real bug to fix

`subscribers.email` is the primary key and `/api/subscribe` uses `INSERT OR IGNORE`. Once
deletes become soft, a removed address keeps its row, so **that person can never
re-subscribe** — the insert silently no-ops and the form still says "You're on the list."

Fix: change to
`INSERT INTO subscribers (email, source) VALUES (?,?) ON CONFLICT(email) DO UPDATE SET deleted_at = NULL, source = excluded.source`.

Every other read gets `AND deleted_at IS NULL`. The audit of read paths:
`getUpcomingEvents`, `getAllEvents`, `getEvent`, `listInquiries`, `getInquiry`,
`countNewInquiries`, `listInquiries`-backed CSV, `listSubscribers`, `listBookingInquiries`,
`isSubscriber`.

### 5.3 Content getters

Pattern already established by `src/lib/settings.ts` — code constant is the default, D1
row overrides it, one `cache()`-wrapped getter merges them, site renders if D1 is empty.

`getBusiness()`, `getCopy()`, `getLegal()`, `getMenu()`, `getCatering()`, `getHours()`,
`getPhotoSlot(id)` / `getPhotoSlots()`, `getOrdering()`, `getBookingRules()`.

Merge is a **deep merge with per-key fallback**, so a new key added to `content/*.ts`
later becomes visible immediately without a migration — that's what makes §4.3's
shape-driven editor work.

`PhotoSlot` becomes `async` and awaits `getPhotoSlot(id)`. Safe: nothing client-side
imports it.

### 5.4 Hours

Structured weekly hours + a label generator, both pure and unit-tested:

- `weeklyLabels(hours)` → `[{label: "Monday–Saturday", value: "7am–4pm"}, {label:"Sunday", value:"Closed"}]`
  by collapsing **consecutive** days with identical times into ranges.
- `shortLabel(hours)` → `"Mon–Sat · 7am–4pm"` for the announcement bar.
- `openingHours(hours)` in `jsonld.ts` is rewritten to read the structure directly —
  the current free-text parser (`to24h`, `dayNames`) is deleted.
- Closure within 7 days overrides the announcement bar and turns it green (reusing the
  existing `closure_notice` rendering path in `AnnouncementBar`).

This also settles the v1 open question about the 4:00 vs 4:15 close — it's just a time
field now.

### 5.5 Authorization

`src/lib/auth.ts` → `requireAdmin(permission?)`, and `src/lib/permissions.ts` holds the
map. Call sites that **must** each call it (the layout check does not protect server
actions, which are separate POST endpoints):

- every `src/app/admin/**/page.tsx`
- every exported function in `src/app/admin/actions.ts` (currently 8, growing)
- every `src/app/api/admin/**/route.ts`

Workforce restriction touches more places than §5.1 lists. Full set:
`/admin/inquiries` list, the type filter dropdown, `countNewInquiries` (sidebar badge
**and** the new dashboard), `/admin/inquiries/[id]`, the CSV export, `listBookingInquiries`
(unaffected — event/catering only), and the Trash page.

---

## 6. Files and R2

### 6.1 Bindings and typings

`MEDIA` R2 binding added to both env blocks. `src/types/cloudflare.d.ts` gains a minimal
`R2Bucket` / `R2Object` / `R2ObjectBody` declaration in the same style as the D1 one —
**not** `@cloudflare/workers-types`, which clashes with the DOM lib.

### 6.2 Routes

| Route | Serves |
|---|---|
| `src/app/media/[...key]/route.ts` | R2 object, `Cache-Control: public, max-age=31536000, immutable` |
| `src/app/files/[name]/route.ts` | current version for a document slug; keeps `/files/private-event-rental-agreement.pdf` etc. working |
| `src/app/api/admin/upload/route.ts` | `requireAdmin`, type + size check, hash, R2 put, `media` insert |

**Blocking detail:** `public/files/*.pdf` and `public/photos/*.webp` are served as static
assets *before* the Worker runs, so they'd shadow the new routes. Phase 3 moves them to
`seed/files/` and `seed/photos/`. `public/files/README.md` and `public/photos/README.md`
move to `docs/` (their content also becomes admin Help text) — a stray `README.md` left in
`public/files/` would be publicly reachable at `/files/README.md`.

### 6.3 Content addressing and dedupe

Keys are `media/<sha256>.<ext>`, so the same bytes uploaded twice produce one R2 object.
`media.key` is deliberately **not unique**: two slots may need different alt text or
credits for the same image, so they get separate rows sharing a key. Purge-on-delete-
forever therefore checks `SELECT count(*) FROM media WHERE key = ? AND deleted_at IS NULL`
before removing the object — which is exactly the rule §2.2 states.

### 6.4 Menu PDF

Auto mode renders with `pdf-lib` + `@pdf-lib/fontkit`, cached in R2 under
`generated/menu-<sha256 of menu JSON>.pdf`, regenerated lazily on first request after a
menu change. **Fonts live in R2** (`seed/fonts/` uploaded by `seed-files`), fetched at
generation time — Fraunces' variable TTF is far too large to sit in the Worker bundle.
Both faces are OFL, so redistribution is fine; I'll include the OFL text alongside them.

Depends on decision §1.2.

---

## 7. Bookings

`src/lib/booking.ts`, pure and unit-tested:

- `busyBlocks(events)` — only `uses_space = 1`, published **and** unpublished, titles
  stripped.
- `openWindows(date, rules, closures)` — weekday windows minus closures.
- `conflicts(candidate, busy, rules)` — overlap + buffer + min/max duration + horizon +
  notice.

Used in three places, which must agree: `GET /api/availability?month=YYYY-MM` (public,
times only, no titles), the `/api/inquiries` server-side re-check, and the admin
"Add to calendar" conflict warning with its "Book anyway" override.

`/api/availability` is public and hits D1 per request. Low traffic, but I'll cap the
response to one month and validate the parameter strictly.

---

## 8. Analytics

`/api/track` is **not** behind the proxy matcher (`/admin/:path*`, `/api/admin/:path*`),
so it's publicly writable. Guards: strict name allowlist, path length cap, no IP/UA/body
beyond `{name, path}`, and a cheap per-request sanity check. Worth knowing: D1's free tier
allows 100k writes/day; at this site's traffic that's not close, but if it ever is, the
fix is to aggregate into daily counters rather than one row per event.

The dashboard's 6-month weekly rollup is a `GROUP BY strftime('%Y-%W', created_at)` query
plus a hand-rolled inline SVG bar chart — no chart library, per §7.

---

## 9. Portability

`wrangler.jsonc` grows an `env.production` block that **redeclares every binding and var**
(wrangler does not inherit them into named environments). Top level stays dev
(`bwsll.tully.sh`). Production adds `workers_dev: false`, `preview_urls: false`.

`scripts/{provision,seed-files,export,import,verify}.mjs`, plain Node, no new runtime
deps, each taking `--env dev|production`, all shelling out to `wrangler`. D1 is the R2
manifest, so no bucket listing is needed. `backup/` gets gitignored.

---

## 10. Tests

`vitest`, pure logic only, `node:sqlite` for the `mutate()`/restore round trip:

- hours label generation + `openingHours`
- booking overlap and rule enforcement
- the permissions map (every route × role)
- `mutate()` → History → Restore round trip
- menu and copy zod schemas
- export/import manifest logic

`npm run typecheck && npm run lint && npm run build && npm test` green at the end of every
phase.

---

## 11. Risks, ranked

1. **Access policy → Everyone (§3.3).** Today Access allowlists emails at the edge; after
   this change *anyone who can receive email* passes Access and reaches the Worker, and
   `requireAdmin()` is the only remaining gate. That's a normal pattern and it's what
   self-service team management requires — but it means a single missing `requireAdmin()`
   in one server action is a full data breach, not a defence-in-depth failure. Mitigation:
   the permissions test enumerates every admin entry point and fails if one is unguarded.
2. **`last_insert_rowid()` inside `db.batch()`** (§5.1) — proven or replaced on day one of
   Phase 2.
3. **Worker bundle** (§1.2) — measure after `pdf-lib` lands; fall back to generate-on-save.
4. **`inquiries` table rebuild** (§4) — destructive if wrong. It runs against a fresh
   remote export first, and `verify` compares row counts.
5. **Static-asset shadowing** (§6.2) — caught now, easy to regress if anything is ever put
   back under `public/files/`.

---

## 12. Phase checklist

Matches §10 of the spec. Each phase ends with typecheck + lint + build + tests green, a
summary, a click-through list, and a stop.

| Phase | Migrations | Main risk |
|---|---|---|
| 2 Foundations | 0003 | `last_insert_rowid()`; every action guarded |
| 3 Files | 0004 | static-asset shadowing; Safari WebP fallback |
| 4 Business/hours/text | 0005 | hours label generation fidelity |
| 5 Menu + PDF | — | bundle size |
| 6 Catering/events/availability | 0006 | three call sites agreeing on conflict logic |
| 7 Inquiries/club | 0007, 0008 | table rebuild |
| 8 Analytics/dashboard/help | 0009 | — |
| 9 Portability + docs | — | round trip into a scratch account |
