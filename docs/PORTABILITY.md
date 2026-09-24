# Backups, and moving the site to another Cloudflare account

Written for: whoever hands this site over, takes it over, or has to put it back after
something goes wrong.

The site is three things: the code in this repo, a **D1 database**, and an **R2 bucket**.
The code is portable by definition. The other two are what these scripts move.

```
npm run provision -- --env production     # create the database and bucket, apply migrations, seed files
npm run backup    -- --env production     # every row, and every file a row points at → backup/
npm run restore   -- --env production --from backup/<dir>
npm run verify    -- --env production     # is this site whole?
```

All four are plain Node calling the `wrangler` that's already in `devDependencies` — no
extra dependencies, and nothing that can drift from what `npm run cf:deploy` does. They
act on **whichever Cloudflare account you're logged into**, so start every session with
`npx wrangler whoami`.

`--env dev` (the default) means `bwsll` / `bwsll-media`, the temporary site at
bwsll.tully.sh. `--env production` means `bwsll-prod` / `bwsll-media-prod`, the client's
own account. Add `--local` to work against the development database on your machine.

---

## Moving the site to the client's account

1. **Back up what exists**, from the account that has it today:

   ```bash
   npm run backup -- --env dev
   ```

2. **Log into the destination account** — `npx wrangler login` — and check with
   `npx wrangler whoami` that it's the right one. Everything below creates real resources.

3. **Provision**:

   ```bash
   npm run provision -- --env production
   ```

   This creates the D1 database and the R2 bucket, writes the new database id into
   `wrangler.jsonc`, applies every migration, and uploads `seed/`. It's safe to re-run:
   anything that already exists is left alone.

4. **Do the dashboard half.** Provision prints the list when it finishes, and
   [DEPLOY.md](../DEPLOY.md) has the detail: a Turnstile widget, a Resend domain, two
   Cloudflare Access applications (`admin` and `api/admin`), and the four `vars` those
   produce. `OWNER_EMAILS` must be the client's address — it's the account that can always
   sign in, even if the team table is ever emptied.

5. **Restore the content**:

   ```bash
   npm run restore -- --env production --from backup/bwsll-2026-09-24T02-00-42
   ```

6. **Deploy, point the domain, then check**:

   ```bash
   npm run cf:deploy:prod
   npm run verify -- --env production
   ```

   Verify exits non-zero if anything is missing, so it's worth running before you tell
   anyone the site has moved.

---

## What a backup contains

```
backup/bwsll-2026-09-24T02-00-42/
  manifest.json      which database, when, which migrations, row counts, file list
  db/<table>.json    every row of every table the site owns
  files/<key>        every R2 object a live row points at, plus the two menu fonts
```

**Rows keep their ids on the way back in.** That matters more than it looks: revisions,
Deleted items, the event created from an inquiry and the club member linked to one all
refer to rows by id. Renumbering would quietly point them at the wrong people.
`tests/portability.test.ts` pins that.

What a backup does **not** contain, and why:

| Not included | Where it comes from instead |
|---|---|
| Secrets (`RESEND_API_KEY`, `TURNSTILE_SECRET`) | `wrangler secret put` — they're write-only by design |
| Cloudflare Access applications, Turnstile widget, DNS | The dashboard. DEPLOY.md §2–4 |
| Generated menu PDFs (`generated/*.pdf`) | A cache. Rebuilt from the menu rows on the next request |
| Files behind deleted photos | Already gone: deleting a photo removes the R2 object once nothing else points at that key |
| `d1_migrations` | The destination gets its schema by running the migrations itself |

---

## Restoring, and the guard rail

`restore` refuses to run when the target already holds real data — an inquiry, a
subscriber, an uploaded file, a club member, a closed day, a team member. That is
deliberate: the common mistake is restoring an old backup onto a live site.

```
✗ bwsll-prod already holds data (inquiries, media).
  Take an export of it first, then re-run with --force if you really mean to overwrite.
```

Do what it says — back the target up first, then pass `--force`. Restoring is
`INSERT OR REPLACE` row by row, so it overwrites rows that share an id and leaves anything
else in place; it never drops a table. A seeded row the backup has no id for stays behind,
and `verify` reports that table as holding more rows than the backup — which is the reason
to run it afterwards.

## Rehearsing a restore

`--local --persist-to <directory>` puts the database and bucket somewhere other than
`.wrangler/`, so a full restore can be practised without touching anything you use:

```bash
npx wrangler d1 migrations apply bwsll --local --persist-to /tmp/rehearsal
npm run restore -- --env dev --local --persist-to /tmp/rehearsal --from backup/<dir>
npm run verify  -- --env dev --local --persist-to /tmp/rehearsal --from backup/<dir>
```

That is exactly how this was proven: a backup of the deployed dev site restored into an
empty database and bucket, with every table's count matching the manifest.

---

## What `verify` checks

- **Every migration in `migrations/` has been applied.** This is first because it has
  already gone wrong once here: code deployed ahead of its migrations shows up as a 500 on
  whichever admin page reads the new column, and nowhere else.
- Row counts, against a backup's manifest when you pass `--from`.
- That every live `media` row has its file in R2 — a missing one is a broken image or a
  download that 404s.
- That the menu fonts are uploaded (a note, not a failure: the PDF falls back to a
  standard face).
- That `wrangler.jsonc` has no `REPLACE_WITH_…` values left, `OWNER_EMAILS` is a real
  address, and both secrets are set.
- That the public pages answer 200, and `/admin` challenges rather than opening — including
  a check for `dev@localhost`, which would mean a development bypass reached production.

---

## Keeping backups

Nothing runs these on a schedule. `backup/` is gitignored, and it holds real inquiries and
real email addresses — treat a backup directory like the database it came from, and don't
put one somewhere public.

Worth taking one before anything irreversible: a migration that rebuilds a table, a
restore, or the account move itself. D1 also has its own time-travel restore for the last
30 days, which covers accidents but not the bucket.
