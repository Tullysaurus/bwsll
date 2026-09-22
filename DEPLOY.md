# Deploying bwsll.com

Written for: whoever sets up the Cloudflare account and runs the DNS migration.

Everything in `wrangler.jsonc` marked `REPLACE_WITH_…` needs a real value before the first
deploy. Work through the steps in order.

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
| Policy | Action **Allow**, rule **Emails** → the owner's address(es) |
| Identity provider | One-time PIN |

Then copy two values into `wrangler.jsonc` → `vars`:

- `CF_ACCESS_TEAM_DOMAIN` — your team domain, e.g. `bwsll.cloudflareaccess.com`
- `CF_ACCESS_AUD` — the application's **Application Audience (AUD) tag**

`src/proxy.ts` verifies the `Cf-Access-Jwt-Assertion` header against those values, so the
admin stays closed even if the Access application is later removed. Make sure `DEV_ADMIN`
is **not** set in production.

> The OpenNext build prints *"Node.js middleware support is experimental in cloudflare"*.
> That is inherent to Next 16: Proxy always runs on the Node.js runtime and the runtime
> cannot be changed. It is a second lock, not the only one — Cloudflare Access still gates
> `/admin` at the edge before a request reaches the Worker. Re-check `/admin` after any
> Next or OpenNext upgrade.

## 5. First deploy

```bash
npm run cf:deploy
```

This builds with OpenNext and publishes to a `*.workers.dev` URL. Open `/admin` — Access
should challenge you for a PIN. Send yourself a test inquiry from `/visit` and confirm the
email arrives.

> If `npm install` reported blocked install scripts for `workerd` or `esbuild`, run
> `npm install-scripts approve workerd esbuild` (or reinstall without the block) before
> `cf:build` — the Worker build needs their native binaries.

## 6. Domain migration off GoDaddy

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

## 7. After launch

- Update the **Google Business Profile** website link, hours and address.
- Update **Visit Tulsa**, **TravelOK** and **Yelp** — several still list 10 N Greenwood.
- Confirm `/robots.txt` and `/sitemap.xml` resolve, and submit the sitemap in Search Console.
- Set `SITE_URL` in `wrangler.jsonc` to `https://bwsll.com` (it already is) — it drives
  canonical URLs, the sitemap and the admin link inside notification emails.

## Regenerating the icons and share image

`src/app/favicon.ico`, `src/app/apple-icon.png` and `public/og-default.png` were generated
from the **placeholder** globe mark and the site's tokens. When the client's real logo
arrives, swap `src/components/Logo.tsx` and `src/app/icon.svg`, then regenerate the three
raster files to match.
