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
| `npm run typecheck` / `npm run lint` | Standard checks |
| `npm run db:migrate:local` / `npm run db:migrate` | Apply `migrations/` to the local / remote D1 database |
| `npm run cf:preview` | Build with OpenNext and run the real Worker locally |
| `npm run cf:deploy` | Build and deploy to Cloudflare |

## Where things live

```
src/content/      business facts, menu, catering packages, photo slots, page copy, legal copy
src/lib/          D1 helpers, settings, zod schemas, Resend, Turnstile, Access JWT, dates, JSON-LD
src/components/   design-system components (Button, PhotoSlot, InquiryForm, CateringEstimator, …)
src/app/(home)/   the home page (full footer)
src/app/(site)/   every other public page (compact footer)
src/app/admin/    owner admin, gated by Cloudflare Access
src/app/api/      /api/inquiries, /api/subscribe, /api/admin/subscribers (CSV)
src/proxy.ts      verifies the Cloudflare Access JWT for /admin and /api/admin
migrations/       D1 schema + seed
```

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

### Site credit

Defined once as `credit` in `src/content/business.ts` and rendered in three places:
the footer's bottom row ("Site by Tully"), the `author` / `creator` metadata in
`src/app/layout.tsx`, and `public/humans.txt`. Removing the visible credit is a one-line
change; the metadata and humans.txt stand on their own.

### The three things that change most often

- **Menu** — `src/content/menu.ts` (a code edit; there is no menu editor in v1).
- **Photos** — add a `src` to a slot in `src/content/photos.ts`; see `public/photos/README.md`.
- **Hours, announcements, rental rates, response time** — the owner edits these at
  `/admin/settings`; the values in `src/lib/settings.ts` are only the fallback defaults.

## Deploying

See [DEPLOY.md](DEPLOY.md) for Cloudflare setup, secrets, Access configuration and the
DNS migration off GoDaddy.

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
