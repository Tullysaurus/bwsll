# Black Wall Street Liquid Lounge — bwsll.com

Next.js (App Router) site for Black Wall Street Liquid Lounge, deployed to Cloudflare
Workers via the OpenNext adapter. Built to the "Liquid Lounge — Website Build Spec (v1)"
document, which stays the source of truth for design tokens, copy and behaviour — drop it
in this repo as `SPEC.md` so it travels with the code. Section references in the source
comments (`§4.4`, `§5.3`, …) point at it.

## Run it locally

```bash
npm install
cp .env.example .env.local        # DEV_ADMIN=1 opens /admin without Cloudflare Access
cp .dev.vars.example .dev.vars    # worker vars + the Turnstile "always passes" test keys
npm run db:migrate:local          # creates the local D1 database and seeds it
npm run dev
```

The app degrades gracefully when things aren't configured yet:

| Missing | Behaviour |
|---|---|
| D1 binding | Settings fall back to the defaults in `src/lib/settings.ts`; the events list is empty; form submits return a 500 with a friendly message |
| `TURNSTILE_SECRET` | Captcha verification is skipped (a warning is logged) |
| `RESEND_API_KEY` | The notification email is written to the console instead of sent |
| `DEV_ADMIN=1` | `/admin` opens without an Access JWT — **never set this in production** |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server with local Cloudflare bindings |
| `npm run build` / `npm run typecheck` / `npm run lint` | Standard checks |
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
