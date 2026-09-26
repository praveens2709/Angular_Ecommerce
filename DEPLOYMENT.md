# Deploying DopeShope

A free setup that fits this project:

| Piece | Service | Free tier (check current limits before relying on them) |
|---|---|---|
| Database | **MongoDB Atlas** M0 | 512 MB, already in use |
| API (`ecom-backend`) | **Render** web service, kept awake by **UptimeRobot** | 750 h/month covers one always-on service |
| Storefront (`ecom-frontend`) | **Cloudflare Pages** (pre-rendered) | Unlimited static bandwidth, 500 builds/month, never sleeps |
| Email | **Brevo** SMTP | ~300 emails/day |
| Product images | **Cloudinary** | ~25 GB storage+bandwidth credits/month |

Why this split: Render's free plan sleeps after ~15 idle minutes (the next visit waits 30-60 s) and its free CPU is slow, so the
storefront is pre-rendered to plain HTML on Cloudflare instead of being rendered on a server per visit. Public pages (home, shop,
every product, policies) are built with their data; account, bag, checkout and admin load as a normal single-page app. Live stock
and prices are fetched right after a pre-rendered page loads, and product/category changes in admin trigger a rebuild
(`SITE_REBUILD_HOOK_URL`). Render's disk is wiped on every deploy, which is why images must go to Cloudinary.

The Render storefront service (`dopeshope-web` in `render.yaml`) still works as a server-rendered alternative, but running it and
the API on the free plan means both sleep.

### Storefront on Cloudflare Pages

1. Cloudflare dashboard -> **Workers & Pages -> Create -> Pages -> Connect to Git** -> this repo, branch `main`.
2. Build settings: **Root directory** `ecom-frontend`, **Build command** `npm run build:cloudflare`,
   **Build output directory** `dist/ecom/browser`.
3. Environment variables: `API_URL` = `https://dopeshope-api.onrender.com/api`, `NODE_VERSION` = `22`.
4. After the first deploy: **Settings -> Builds -> Deploy hooks** -> create one, and put its URL in the API's
   `SITE_REBUILD_HOOK_URL` on Render.
5. Add the storefront's addresses (e.g. `https://dopeshope.pages.dev` and your domain) to the API's `CLIENT_ORIGINS`.
6. Custom domain: **Custom domains -> Set up a domain**. A root domain (`dopeshope.co.in`) needs the domain's DNS on Cloudflare
   (change the nameservers at your registrar; check that the imported MX/TXT/DKIM email records are all there).

Local check of the static build: `API_URL=http://localhost:4000/api npm run build:cloudflare`, then
`npx wrangler pages dev dist/ecom/browser` (applies `_redirects`, `_headers` and `functions/` like Cloudflare does).

### Keep the API awake

UptimeRobot (free): new **HTTP(s)** monitor for `https://dopeshope-api.onrender.com/api/health`, every 5 minutes.
Don't do this for two Render services: two always-on services need ~1,440 h/month, more than the free 750 h.

---|---|---|
| Database | **MongoDB Atlas** M0 | 512 MB, already in use |
| API (`ecom-backend`) | **Render** web service | Sleeps after ~15 min idle; first request then takes ~30–60 s |
| Storefront (`ecom-frontend`, server-rendered) | **Render** web service | Same as above |
| Email | **Brevo** SMTP | ~300 emails/day |
| Product images | **Cloudinary** | ~25 GB storage+bandwidth credits/month |

Why these: they need no credit card to start, Render runs both Node apps (including the Angular SSR server) with no code changes, and
Render's disk is wiped on every deploy, which is why images must go to Cloudinary rather than `ecom-backend/uploads`.

Alternatives if the Render cold start bothers you: Railway (small monthly credit, no sleeping) or a paid Render instance (~$7/month
each). For email, Resend (3,000/month) also works over SMTP but needs your own domain.

---

## 1. Accounts to create

1. **Cloudinary**: sign up → Dashboard → copy the *API environment variable* (`cloudinary://<key>:<secret>@<cloud>`).
2. **Brevo**: sign up → *SMTP & API* → **API Keys** tab → create an API key (starts with `xkeysib-`). Under *Senders*, add and
   verify the address you'll send from (e.g. `orders@yourdomain.com`, or your Gmail while testing).
   Use the API key, not SMTP: Render's free plan blocks outgoing SMTP ports (25/465/587), so SMTP sends just time out.
3. **Atlas**: *Network Access* → allow `0.0.0.0/0` (Render's IPs change). Keep the database user with `readWrite` on your database.

## 2. Deploy on Render

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → choose the repo. It reads `render.yaml` and creates `dopeshope-api` and `dopeshope-web`.
3. Fill in the values it asks for:

   **dopeshope-api**
   - `MONGODB_URI`: your Atlas connection string
   - `CLIENT_URL` and `CLIENT_ORIGINS`: `https://dopeshope-web.onrender.com` (or your domain)
   - `PUBLIC_URL`: `https://dopeshope-api.onrender.com`
   - `CLOUDINARY_URL`: from step 1
   - `BREVO_API_KEY`: the Brevo API key from step 1; `MAIL_FROM`: `DopeShope <your-verified-sender>`
     (SMTP via `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` still works on hosts that allow it; the API key wins if both are set)
   - `STORE_*`: your legal name, support email, phone, address, city, state, pincode and GSTIN. These appear on the policy pages,
     the Contact page and every invoice. `STORE_STATE`/`STORE_PINCODE` should be where you ship from.

   **dopeshope-web**
   - `API_URL`: `https://dopeshope-api.onrender.com/api`
   - `NG_ALLOWED_HOSTS`: `dopeshope-web.onrender.com` (add your custom domain later)

4. Wait for both to build, then open the storefront URL.

`JWT_SECRET` is generated by Render. Changing it later signs everyone out.

## 3. After the first deploy

- **Create the admin**: open `/admin/auth`, choose Register. This only works while no admin exists; afterwards only an admin can
  add admins.
- **Turn on stock tracking** for existing products (Admin → Products → edit → *Track stock per size*).
- **Re-upload the product image stored as embedded text** (one Atlas product has a `data:image/...` image) so it's served from Cloudinary.
- **Send yourself a test**: register, place a COD order, check the confirmation email and download the invoice.
- **Custom domain** (optional): add it to `dopeshope-web` in Render, then append it to `NG_ALLOWED_HOSTS`, `CLIENT_URL` and
  `CLIENT_ORIGINS`.

## Settings reference

- Backend: every setting is documented in [`ecom-backend/.env.example`](ecom-backend/.env.example).
- Storefront: `API_URL` (public API base), optional `API_URL_INTERNAL` (faster URL the SSR server uses to reach the API),
  `NG_ALLOWED_HOSTS`, `PORT`. The browser receives `API_URL` from the server at runtime, so one build works anywhere.

## Running locally

```bash
# API (http://localhost:4000)
cd ecom-backend && cp .env.example .env   # fill in MONGODB_URI and JWT_SECRET
npm install && npm run dev

# Storefront (http://localhost:4200)
cd ecom-frontend && npm install && npm start
```

Without `BREVO_API_KEY` or `SMTP_HOST`, emails (including password-reset links) are printed in the API's console.
In production every send logs `Email sent via …` or `Email failed via …: <reason>` in the API logs.

## Tests

```bash
cd ecom-backend && npm test          # API: security, orders, stock, coupons, invoices...
cd ecom-frontend && npm run test:ci  # unit tests (needs Chrome)
cd e2e && npm install && npm test    # browser walkthroughs against a throwaway local stack, see e2e/README.md
```

## Before accepting real payments

- **Payment verification** is not implemented yet: orders store the Razorpay payment ID sent by the browser without checking it
  server-side. Implement Razorpay order creation + signature verification (or webhooks) before going live with online payments.
  Cash on delivery works as is.
- Have the policy pages (`/privacy-policy`, `/terms`, `/returns-policy`, `/shipping-policy`) reviewed for your business.
- Confirm GST rates/HSN codes with your accountant (`GST_RATE_*`, `GST_THRESHOLD`, `DEFAULT_HSN`).
