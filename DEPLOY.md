# Deploying bwsll.com

Written for: whoever sets up the Cloudflare account and runs the DNS migration.

Steps 1–4 are one-time account setup (already done on this project). Steps 5–6 are the
rules that keep deploys working — read those even if the rest is configured.

---

## 1. Cloudflare account and D1

```bash
npx wrangler login
npx wrangler d1 create bwsll
```

Copy the printed `database_id` into `wrangler.jsonc` → `d1_databases[0].database_id`, then
create the schema and seed data on the real database:

```bash
npm run db:migrate
```

## 1b. R2 bucket and seed files

```bash
npx wrangler r2 bucket create bwsll-media          # or bwsll-media-prod, --env production
npm run seed:files                                  # or seed:files:prod
```

`seed-files` uploads everything in `seed/files`, `seed/photos` and `seed/fonts` to R2 and
records the matching `media`, `documents` and `photo_slots` rows. It is idempotent — keys
are content hashes and every write is an upsert — so re-running it is always safe.

**Never put PDFs or photos back into `public/`.** Static assets are served before the
Worker runs, so a file at `public/files/vendor-agreement.pdf` would silently shadow the
R2-backed route and the owner's uploads would stop appearing.

## 2. Turnstile

Cloudflare dashboard → **Turnstile** → add a widget for `bwsll.com` (Managed mode).

- Put the **site key** in `wrangler.jsonc` → `vars.TURNSTILE_SITE_KEY` (it is public).
- Put the **secret key** in a Worker secret:

```bash
npx wrangler secret put TURNSTILE_SECRET
```

## 3. Resend (notification email)

Send from a **subdomain** so the SPF/DKIM records never touch the root MX records the
owner's existing inbox depends on.

1. Resend → add domain `notify.bwsll.com`.
2. Add the DNS records Resend gives you **to the Cloudflare zone** (after step 6, or to
   GoDaddy first if you want email working before the cutover).
3. Store the API key:

```bash
npx wrangler secret put RESEND_API_KEY
```

`NOTIFY_TO` (`info@bwsll.com`) and `NOTIFY_FROM` are plain vars in `wrangler.jsonc` —
change `NOTIFY_TO` if inquiries should go somewhere else.

Do **not** use Cloudflare Email Routing: it requires taking over the root MX records.

## 4. Cloudflare Access for `/admin`

Zero Trust → **Access → Applications → Add a self-hosted application**.

| Field | Value |
|---|---|
| Application domain | `bwsll.com` |
| Path | `admin` (add a second application for path `api/admin`) |
| Session duration | 30 days |
| Policy | Action **Allow**, Include **Everyone** |
| Identity provider | One-time PIN |

Then copy two values into `wrangler.jsonc` → `vars`:

- `CF_ACCESS_TEAM_DOMAIN` — your team domain, e.g. `bwsll.cloudflareaccess.com`
- `CF_ACCESS_AUD` — the application's **Application Audience (AUD) tag**

`src/proxy.ts` verifies the `Cf-Access-Jwt-Assertion` header against those values, so the
admin stays closed even if the Access application is later removed. Make sure `DEV_ADMIN`
is **not** set in production.

### Why the policy is "Everyone"

The owner adds and removes staff themselves on `/admin/team`, so the allowlist lives in
the app (the `admin_users` table) rather than in the Access policy — otherwise every new
employee would need a Cloudflare login.

**That makes `requireAdmin()` the real gate.** Access still proves the person owns the
email they claim, but anyone who can receive email now reaches the Worker. So:

- every admin page, server action and `/api/admin/*` route calls `requireAdmin()` itself
  — the layout check does not cover server actions, which are separate POST endpoints;
- `OWNER_EMAILS` (a var, comma-separated) is always an active owner, so a fresh deploy or
  an emptied table can never lock everyone out;
- someone signed in but not on the list gets a plain "you don't have access yet" page and
  nothing else;
- `npm test` pins the permissions map, including that staff cannot reach workforce
  applications.

> The OpenNext build prints *"Node.js middleware support is experimental in cloudflare"*.
> That is inherent to Next 16: Proxy always runs on the Node.js runtime and the runtime
> cannot be changed. It is a second lock, not the only one — Cloudflare Access still gates
> `/admin` at the edge before a request reaches the Worker. Re-check `/admin` after any
> Next or OpenNext upgrade.

## 5. Never put config in `.env` files

**This project uses no `.env` files, on purpose.** OpenNext snapshots whatever `.env*`
files exist at build time into the deployed Worker — you can see the result in
`.open-next/cloudflare/next-env.mjs`:

```js
export const production = {};   // must stay empty
```

A `.env.local` containing `DEV_ADMIN=1` therefore ships to production and disables the
Cloudflare Access check on `/admin`; a local `SITE_URL` becomes your public canonical URL
and sitemap host. Both have happened on this project.

So:

| Config | Lives in |
|---|---|
| Local development | `.dev.vars` (copy from `.dev.vars.example`) |
| Production vars | `wrangler.jsonc` → `vars` |
| Production secrets | `npx wrangler secret put <NAME>` |

Two safeguards are in place, but don't rely on them:

- `next.config.ts` **fails the build** if `DEV_ADMIN=1` or a localhost `SITE_URL` is in
  the environment.
- `src/proxy.ts` keys the `/admin` bypass off `NODE_ENV`, so a production build cannot
  take that branch no matter what env vars say. Verify after any deploy:
  `grep -r "dev@localhost" .open-next` should find nothing.

`SITE_URL` is read at request time, so changing it in `wrangler.jsonc` and redeploying is
enough — no rebuild semantics to think about.

## 6. Builds on Cloudflare (Workers Builds)

The stock Workers Builds settings work as-is:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

`npm run build` is `opennextjs-cloudflare build`, which produces `.open-next/` — the
directory `wrangler deploy` needs. Plain `next build` does **not** produce it, and a
deploy on top of it fails with:

```
ERROR Could not find compiled Open Next config, did you run the build command?
```

Two details make this work and are easy to break:

- `open-next.config.ts` sets `buildCommand: "npm run build:next"`. OpenNext shells out to
  `npm run build` by default, which would recurse into itself. `build:next` is the plain
  `next build`.
- `package.json` has an `allowScripts` block for `esbuild`, `workerd` and
  `unrs-resolver`. Without it npm blocks their install scripts in CI and the bundler has
  no native binary. If new packages need approval, `npm approve-scripts <pkg>` adds them.

## 7. First deploy

```bash
npm run cf:deploy     # or just `git push` once Workers Builds is connected
```

Open `/admin` — Access should challenge you for a one-time PIN, and the header should show
**your** email address. If it says `dev@localhost`, a dev bypass reached production: check
for a stray `.env` file and confirm `next-env.mjs` is empty.

Send yourself a test inquiry from `/visit` and confirm the notification email arrives.

## 8. Domain migration off GoDaddy

Do these in order, and don't cancel anything until the new site **and** email are verified.

1. **Download the PDFs and photos** from the current bwsll.com first — see
   `public/files/README.md`. They disappear when the GoDaddy plan ends.
2. **Record every existing DNS record** — especially `MX`, SPF/`TXT`, DKIM and
   autodiscover. `info@bwsll.com` must keep working. Screenshot the whole zone.
3. Add `bwsll.com` to Cloudflare and change the nameservers at the registrar. Registrar
   transfer is optional and can happen later.
4. **Recreate every record exactly**, MX and mail TXT records first.
5. Workers & Pages → the `bwsll` worker → **Custom domains** → add `bwsll.com`, and add a
   redirect rule sending `www.bwsll.com` → `https://bwsll.com`.
6. Verify `notify.bwsll.com` in Resend and send a test inquiry end to end.
7. Check that mail to `info@bwsll.com` still arrives.
8. Only then cancel the GoDaddy Website Builder plan.

## 9. After launch

- Update the **Google Business Profile** website link, hours and address.
- Update **Visit Tulsa**, **TravelOK** and **Yelp** — several still list 10 N Greenwood.
- Confirm `/robots.txt` and `/sitemap.xml` resolve, and submit the sitemap in Search Console.
- Set `SITE_URL` in `wrangler.jsonc` to `https://bwsll.com` — it drives canonical URLs,
  the sitemap, robots.txt and the admin link inside notification emails, and it is still
  pointed at the temporary domain.

## Regenerating the icons and share image

`src/app/favicon.ico`, `src/app/apple-icon.png` and `public/og-default.png` were generated
from the **placeholder** globe mark and the site's tokens. When the client's real logo
arrives, swap `src/components/Logo.tsx` and `src/app/icon.svg`, then regenerate the three
raster files to match.
