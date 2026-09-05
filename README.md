# LeadFlow CRM

A multi-tenant CRM SaaS built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Prisma/PostgreSQL**.

Every signup creates an isolated **Organization** (tenant) — this is what lets you run one deployment and sell access to many customers. Each organization gets:

- **Leads / Contacts / Deals / Pipeline** — the core CRM (status: New → Contacted → Qualified → Negotiation → Won/Lost/Dead)
- **Official WhatsApp Business (Meta Cloud API) automation** — pick which approved template fires when a lead becomes Lost, Dead, Won, etc.
- **Meta Ads, Google Ads & Shopify integrations** — auto-import leads/customers, plus an ads performance dashboard
- **Outgoing API** — signed webhooks + a documented REST API (`/api/v1/*`, API-key authenticated) + a native Google Sheets push, so a customer can pipe their data into their own ERP or spreadsheet
- **Full reporting** with CSV/PDF export
- **Razorpay subscription billing** (Starter / Growth / Pro plans)
- A public marketing **landing page + pricing page**

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS + a small hand-rolled shadcn-style UI kit (Radix primitives under the hood for Dialog/Dropdown/Tabs/Toast) |
| Database | PostgreSQL via Prisma ORM |
| Background jobs | BullMQ + Redis (WhatsApp sending, webhook delivery with retries, ad-platform sync) |
| Auth | NextAuth.js (credentials/email+password), JWT sessions |
| Billing | Razorpay (subscriptions) |
| Charts | Recharts |
| Deployment target | Railway (Nixpacks, two services: web + worker) |

## Project structure

```
prisma/schema.prisma        Data model (organizations, leads, WhatsApp, integrations, billing...)
prisma/seed.ts               Demo data (plans + a demo org/login)
src/app/(marketing)/         Public landing page + pricing
src/app/(auth)/               Login / register
src/app/(dashboard)/          The CRM app (leads, pipeline, contacts, deals, whatsapp, integrations, reports, settings)
src/app/api/                  All route handlers, incl. /api/v1/* (public outgoing API) and /api/webhooks/* (inbound platform webhooks)
src/lib/                      Shared server logic: prisma client, auth, rbac, encryption, plan limits,
                               automation engine, webhooks/event bus, queue setup, and one file per
                               integration (whatsapp, meta-ads, google-ads, shopify, google-sheets, razorpay)
src/worker/index.ts            Standalone process that processes the BullMQ queues
src/components/ui/            Reusable UI primitives (Button, Card, Dialog, Table, ...)
```

## Local development

1. **Install dependencies**
   ```
   npm install
   ```
2. **Copy environment variables**
   ```
   cp .env.example .env
   ```
   At minimum for local dev you need `DATABASE_URL` (Postgres), `NEXTAUTH_SECRET`, and `ENCRYPTION_KEY`. Everything else (WhatsApp/Meta/Google/Shopify/Razorpay) can stay blank until you're ready to test that specific integration — the rest of the app works fine without them.
   - `NEXTAUTH_SECRET`: `openssl rand -base64 32`
   - `ENCRYPTION_KEY`: `openssl rand -hex 32`
3. **Database**
   ```
   npm run db:migrate   # creates tables
   npm run db:seed      # seeds plans + a demo org (login: owner@demo.com / Demo@1234)
   ```
4. **Redis** — needed for WhatsApp sending / webhooks / ads sync to actually run. Easiest local option: `docker run -p 6379:6379 redis`. Point `REDIS_URL=redis://localhost:6379` at it. Core CRM (leads/pipeline/contacts/deals) works fine even without Redis running — only background-job features will log an error until it's available.
5. **Run**
   ```
   npm run dev          # web app on http://localhost:3000
   npm run worker:dev   # in a second terminal — processes background jobs
   ```

## Where to get each integration's credentials

See **DEPLOY.md** for the full list (Meta for Developers, Google Cloud Console + Google Ads API Center, Shopify Partner Dashboard, Razorpay Dashboard) with exact steps for each.

## Deploying

See **DEPLOY.md** for step-by-step Railway deployment (Postgres + Redis plugins, two services, environment variables, running database migrations on release).

## Multi-tenancy & selling this as a product

Every API route scopes every database query by the logged-in user's `organizationId` — there is no cross-tenant data access. Signing up via `/register` creates a brand new Organization + its first OWNER user + a 14-day trial subscription automatically, so you can point paying customers straight at your deployed URL and they'll each get their own isolated workspace.
