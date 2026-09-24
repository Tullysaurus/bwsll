# Black Wall Street Liquid Lounge — bwsll.com

Next.js (App Router) site for Black Wall Street Liquid Lounge, deployed to Cloudflare
Workers via the OpenNext adapter. Built to the "Liquid Lounge — Website Build Spec (v1)"
document, which stays the source of truth for design tokens, copy and behaviour — drop it
in this repo as `SPEC.md` so it travels with the code. Section references in the source
comments (`§4.4`, `§5.3`, …) point at it.

## Run it locally

```bash
npm install
cp .dev.vars.example .dev.vars    # local config — see the warning below
npm run db:migrate:local          # creates the local D1 database and seeds it
npm run dev
```

> **Never create a `.env` or `.env.local` file in this project.** OpenNext bakes `.env*`
> files into the deployed Worker, so local values reach production — including the
> `/admin` auth bypass. Local config goes in `.dev.vars`; production config in
> `wrangler.jsonc` → `vars` and `wrangler secret put`. `next.config.ts` fails the build if
> it catches a dangerous value, and the `/admin` bypass is keyed off `NODE_ENV` so a
> production build can never take it. See [DEPLOY.md](DEPLOY.md) §5.

`/admin` opens automatically in development. Set `DEV_ADMIN=0` in `.dev.vars` to exercise
the real Cloudflare Access path.

The app degrades gracefully when things aren't configured yet:

| Missing | Behaviour |
|---|---|
| D1 binding | Settings fall back to the defaults in `src/lib/settings.ts`; the events list is empty; form submits return a 500 with a friendly message |
| `TURNSTILE_SECRET` | Captcha verification is skipped (a warning is logged) |
| `RESEND_API_KEY` | The notification email is written to the console instead of sent |
| `DEV_ADMIN` | Unset in dev, `/admin` opens without an Access JWT. Ignored entirely by production builds. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server with local Cloudflare bindings |
| `npm run build` | Full Cloudflare build (`opennextjs-cloudflare build`) — this is what Workers Builds runs |
| `npm run build:next` | Plain `next build`, for a quick check |
| `npm run typecheck` / `npm run lint` / `npm test` | Standard checks |
| `npm run db:migrate:prod` / `npm run cf:deploy:prod` | Same, against the client's account (`--env production`) |
| `npm run db:migrate:local` / `npm run db:migrate` | Apply `migrations/` to the local / remote D1 database |
| `npm run cf:preview` | Build with OpenNext and run the real Worker locally |
| `npm run cf:deploy` | Build and deploy to Cloudflare |
| `npm run backup -- --env dev` | Every row and every file it points at → `backup/` (gitignored) |
| `npm run restore -- --env dev --from backup/<dir>` | Put a backup back. Refuses to overwrite a site in use without `--force` |
| `npm run verify -- --env dev` | Migrations applied, files present, no placeholder config, secrets set |
| `npm run provision -- --env production` | Create the database and bucket in a fresh Cloudflare account |

## Where things live

```
src/content/      business facts, menu, catering packages, photo slots, page copy, legal copy
src/lib/          D1 helpers, settings, zod schemas, Resend, Turnstile, Access JWT, dates, JSON-LD
src/components/   design-system components (Button, PhotoSlot, InquiryForm, CateringEstimator, …)
src/app/(home)/   the home page
src/app/(site)/   every other public page
src/app/admin/    owner admin, gated by Cloudflare Access
src/app/api/      /api/inquiries, /api/subscribe, /api/admin/subscribers (CSV)
src/proxy.ts      verifies the Cloudflare Access JWT for /admin and /api/admin
src/app/media/    streams R2 objects; src/app/files/ serves documents by slug
migrations/       D1 schema + seed
scripts/          provision / seed-files / export / import / verify (plain Node + wrangler)
seed/             files, photos and fonts uploaded to R2 by `npm run seed:files`
docs/             PLAN-v2.md, PORTABILITY.md, FILES.md, PHOTOS.md
```

Nothing lives in `public/` that would shadow a route: the PDFs and photos moved to
`seed/` in v2 because static assets are served *before* the Worker runs and would have
hidden `/files/*` and `/media/*`.

### Acting on an inquiry

Inquiries aren't just a log — each one can be turned into work from either the list or the
detail page:

- **Add to calendar** — opens `/admin/events/new?from=<id>` with the title, date, start and
  end time, kind and location already filled in from the request. Anything using the room
  becomes a private event at the Lounge; a catering-only request becomes an off-site
  catering event at the venue address they gave. Everything is editable before saving.
  The same page has an **Autofill from a request** picker, so you can start from the events
  screen instead.
- **Subscribe** — adds that person's email to the mailing list (source `inquiry:<type>`),
  and the row then reads "Subscribed". Removable from the inquiry or the subscribers page.
- **Status** — change new/replied/booked/closed inline in the list, no need to open the row.

`/admin/subscribers` also takes addresses by hand, for people who sign up in the shop.

### Photos and documents

Both live in R2 and are managed from `/admin`:

- **Photos** (`/admin/photos`) lists every spot on the site. Upload once and it appears;
  a spot with no photo keeps its placeholder, so photos can arrive one at a time.
  Images are resized in the browser to 2000px and converted to WebP (JPEG on Safari,
  which silently ignores `canvas.toBlob("image/webp")`). Alt text is required.
  `/admin/photos/library` shows everything uploaded and where it is used.
- **Documents** (`/admin/documents`) replaces a PDF behind its existing public URL, so
  `/files/vendor-agreement.pdf` keeps working forever. Old versions are never overwritten.

Keys are content hashes, so the same file uploaded twice is stored once, and deleting one
record only removes the object when nothing else points at it.

### Admin accounts and safety net

- **Team** (`/admin/team`, owners only) adds people by email. They sign in at `/admin`
  with a one-time code. New people default to **staff**, who can do the day-to-day work
  but cannot manage the team, edit business or legal settings, delete anything forever, or
  see workforce applications. `OWNER_EMAILS` in `wrangler.jsonc` is always an owner.
- **History** — every admin change records who changed what, when. Each record has a
  History link with **Restore this version** on older entries.
- **Trash** (`/admin/trash`) — deletes are soft. Restore puts a record back as it was.
  **Delete forever** is owner-only, and the audit trail survives it.

### Site credit

Defined once as `credit` in `src/content/business.ts` and rendered in three places:
the footer's bottom row ("Site by Tully"), the `author` / `creator` metadata in
`src/app/layout.tsx`, and `public/humans.txt`. Removing the visible credit is a one-line
change; the metadata and humans.txt stand on their own.

### The three things that change most often

The owner does all three themselves now; the files below are only the defaults a fresh
database falls back to.

- **Menu** — `/admin/menu`, which also generates the printable PDF. Default:
  `src/content/menu.ts`.
- **Photos** — `/admin/photos`, one entry per slot on the site. Default:
  `src/content/photos.ts`; see `docs/PHOTOS.md`.
- **Hours, closed days, announcements, page text** — `/admin/hours`, `/admin/announcement`
  and `/admin/text`. Defaults: `src/lib/settings.ts` and `src/content/`.

## Deploying

See [DEPLOY.md](DEPLOY.md) for Cloudflare setup, secrets, Access configuration and the
DNS migration off GoDaddy, and [docs/PORTABILITY.md](docs/PORTABILITY.md) for backups and
moving the site to the client's own Cloudflare account.

## Still waiting on the client

Tracked in `SPEC.md` §13. Everything below ships with a safe default today:

| Open item | What the site does now |
|---|---|
| Rental rates | Shows "Ask us"; editable at `/admin/settings` |
| Closing time (4:00 vs 4:15) | "7am–4pm"; editable at `/admin/settings` |
| Response-time promise | "2 business days"; editable at `/admin/settings` |
| Veggie / chicken kabob pricing | Omitted from the estimator (commented in `src/content/catering.ts`) |
| Croissant sandwiches | Not on the menu |
| Real logo | Placeholder globe in `src/components/Logo.tsx` — one file to swap |
| Photos | Labelled placeholder blocks |
| PDFs | Links are live and 404 until the files land in `public/files/` |
| "Our story" text | Name-free placeholder in `src/content/copy.ts` |
| Business-development description | Neutral placeholder in `src/content/copy.ts` |
| Privacy / terms | Plain-language notices in `src/content/legal.ts` — **need a lawyer's review** |
| Private events on the public calendar | Shown; each event has a `published` toggle in admin |
