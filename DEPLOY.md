# Deploying to Railway

This app deploys as **two Railway services from the same GitHub repo**:

1. **web** — the Next.js app (what your customers open in the browser)
2. **worker** — a background process that sends WhatsApp messages, delivers outgoing webhooks, and syncs Meta/Google/Shopify data

Both share the same Postgres database and Redis instance.

## 1. Push this project to GitHub

```
git init
git add .
git commit -m "Initial CRM"
git branch -M main
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

## 2. Create the Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. Railway will auto-create one service (this becomes your **web** service) using **Nixpacks** — no Dockerfile needed. It reads `railway.json` in this repo for the build/start config.
3. In the same project, click **+ New → Database → Add PostgreSQL**, and **+ New → Database → Add Redis**.
4. Click **+ New → GitHub Repo** again, select the **same repo**, to create the **worker** service. In its **Settings → Deploy**, set the **Start Command** to:
   ```
   npm run worker
   ```
   (leave the Build Command as the Nixpacks default — `npm ci && npm run build` — running `next build` for the worker service is unnecessary work but harmless; if you want a faster worker deploy, you may instead set its Build Command to `npm ci && npx prisma generate`.)

## 3. Environment variables

In **both** the `web` and `worker` services' **Variables** tab, add everything from `.env.example`. The easiest way: in Railway, reference the Postgres/Redis plugins' connection strings directly —
- `DATABASE_URL` → click "Add Reference" → select the Postgres plugin's `DATABASE_URL`
- `REDIS_URL` → same, from the Redis plugin

Set these yourself (same values on both services):
- `APP_URL` / `NEXTAUTH_URL` → your web service's public Railway URL (e.g. `https://your-app.up.railway.app`), or your own custom domain once attached
- `NEXTAUTH_SECRET` → `openssl rand -base64 32`
- `ENCRYPTION_KEY` → `openssl rand -hex 32`
- Everything under WhatsApp / Meta Ads / Google Ads / Shopify / Razorpay — see the credential guide below. You can leave these blank at first and fill them in once you've registered each developer app; each integration only breaks if you try to use it without its keys set.

The **web** service also needs `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same value as `RAZORPAY_KEY_ID`) since it's read in the browser for the Razorpay checkout popup.

## 4. First deploy & database migration

`railway.json`'s start command already runs `npx prisma migrate deploy` before `npm start`, so tables are created automatically on every deploy of the **web** service. After the first successful deploy, seed the demo plans (run once):

```
railway run --service web npm run db:seed
```

(Or open a Railway shell for the web service and run `npm run db:seed` directly.) This creates the Starter/Growth/Pro plans your `/pricing` page and billing settings page read from.

## 5. Custom domain (optional, for selling this)

Railway → web service → **Settings → Networking → Custom Domain**. Point your domain's CNAME at the value Railway gives you, then update `APP_URL`/`NEXTAUTH_URL` (and every integration's redirect URI below) to match.

---

## Getting each integration's credentials

### WhatsApp Business Platform (Meta Cloud API) — official WhatsApp
1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App** → type "Business".
2. Add the **WhatsApp** product to the app. Under **WhatsApp → API Setup** you'll get a temporary access token, a **Phone Number ID**, and a **WhatsApp Business Account ID** — for production, generate a permanent token under **System Users** (Business Settings) with `whatsapp_business_messaging` + `whatsapp_business_management` permissions.
3. Set `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN`.
4. Under **WhatsApp → Configuration**, set the webhook URL to `https://<your-domain>/api/webhooks/whatsapp`, and the verify token to whatever you set as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Subscribe to the `messages` field.
5. `WHATSAPP_APP_SECRET` is under **App Settings → Basic**.
6. Create/submit your message templates for approval under **WhatsApp → Message Templates** (Meta reviews these — usually within a few hours to a day). Once approved, use the "Sync from WhatsApp" button on the CRM's WhatsApp → Templates page to pull them in.

### Meta Ads (Lead Ads)
1. Same Meta app as above (or a new one) → add the **Marketing API** product.
2. `META_APP_ID` / `META_APP_SECRET` are on **App Settings → Basic**.
3. Under **Facebook Login → Settings**, add `https://<your-domain>/api/integrations/meta-ads/callback` as a valid OAuth redirect URI.
4. Under **Webhooks**, subscribe your Page to the `leadgen` field, pointing at `https://<your-domain>/api/webhooks/meta-leadgen` with `META_WEBHOOK_VERIFY_TOKEN`.
5. Your app will need Meta's review to request `leads_retrieval`/`ads_management` for other businesses' ad accounts — for using it on your own ad account only, Standard Access is enough to start.

### Google Ads + Google Sheets
1. Go to [Google Cloud Console](https://console.cloud.google.com) → create a project → **APIs & Services → Credentials → Create OAuth client ID** (type: Web application).
2. Add `https://<your-domain>/api/integrations/google-ads/callback` (and the equivalent `.../google-sheets/callback`) as authorized redirect URIs.
3. Enable the **Google Sheets API** and **Google Ads API** for the project.
4. `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` come from that OAuth client.
5. For Google Ads specifically, apply for a **Developer Token** at [ads.google.com/aw/apicenter](https://ads.google.com/aw/apicenter) (a test-account-only token is issued instantly; production access requires Google's review). Set `GOOGLE_ADS_DEVELOPER_TOKEN` and `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (your manager/MCC account id, digits only).

### Shopify
1. [partners.shopify.com](https://partners.shopify.com) → **Apps → Create app** (Custom app, or Public app if you'll install it on customers' stores you don't own).
2. Under **App setup**, set the redirect URL to `https://<your-domain>/api/integrations/shopify/callback`.
3. `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` are on the app's **Client credentials** page.
4. `SHOPIFY_APP_URL` = your deployed app URL.

### Razorpay (billing)
1. [dashboard.razorpay.com](https://dashboard.razorpay.com) → **Settings → API Keys** → generate a key pair → `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (also copy `RAZORPAY_KEY_ID` into `NEXT_PUBLIC_RAZORPAY_KEY_ID`).
2. Under **Subscriptions → Plans**, create one Razorpay Plan per CRM plan (Starter/Growth/Pro) with the matching monthly amount, then paste each Razorpay Plan ID into that `Plan` row's `razorpayPlanId` column (easiest via `npm run db:studio`).
3. Under **Settings → Webhooks**, add `https://<your-domain>/api/webhooks/razorpay`, subscribe to `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`, and copy the generated secret into `RAZORPAY_WEBHOOK_SECRET`.

---

**Note:** all of the above are the account owner's own developer credentials — this codebase implements the full OAuth/webhook/API integration for each, but creating the developer app/business verification itself has to be done by whoever owns that Meta/Google/Shopify/Razorpay account (i.e., you or your customer).
