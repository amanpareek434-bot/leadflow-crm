# Optional container build for the WEB service only.
# Recommended default is Railway's zero-config Nixpacks builder (no Dockerfile
# needed) for both the web app and the worker — see DEPLOY.md. Use this
# Dockerfile only if you specifically want a containerized web deploy.
#
# NOTE: uses Debian "slim" (not Alpine) as the base — Prisma's query engine
# needs OpenSSL, and Alpine's musl libc + newer OpenSSL 3.x has repeatedly
# caused Prisma engine-detection failures in this project's testing. Slim
# avoids that whole class of problem at the cost of a slightly larger image.

FROM node:20-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# `npm ci` runs the `postinstall` script (`prisma generate`), which needs the
# schema file and a syntactically-valid DATABASE_URL to be present — copy the
# former and stub the latter before installing (the full source, and the real
# DATABASE_URL, only show up later in the `builder`/`runner` stages).
COPY prisma ./prisma
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

# Full node_modules (not just the standalone-traced subset) so the `prisma`
# CLI is available at container start to push the schema to the real
# database — `railway.json`'s startCommand isn't honored when Railway builds
# from this Dockerfile (its own CMD below runs instead), so the one-time
# schema sync has to happen here rather than relying on that file.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# Overwrites the minimal package.json that .next/standalone ships with its
# own (no "scripts" section) — this one has `db:seed` etc, needed below.
COPY --from=builder /app/package.json ./package.json

USER nextjs
# Railway always injects its own PORT env var at runtime (observed as 8080 in
# this project's deploys) — EXPOSE just needs to match that for Railway's edge
# proxy to auto-target the right port; we deliberately do NOT set ENV PORT
# ourselves so Railway's runtime value (whatever it is) always wins.
EXPOSE 8080
# CRITICAL: Next.js's standalone server.js does `process.env.HOSTNAME || '0.0.0.0'`,
# and Docker auto-sets HOSTNAME to the container's own id for every container —
# which made Next bind ONLY to the container's internal bridge IP instead of
# all interfaces, so Railway's edge proxy could never reach it (instant 502s,
# app logs looked perfectly healthy). Force it back to the wildcard address.
ENV HOSTNAME="0.0.0.0"

# No pre-generated migration files exist yet (this project has never been
# run against a real Postgres to create them), so `prisma migrate deploy`
# would silently do nothing and leave the database empty. `db push` syncs
# the schema directly against whatever DATABASE_URL Railway provides at
# runtime — every request touching the DB was crashing with "relation does
# not exist" until this ran. Once you have a stable schema and want a real
# migration history, switch back to `prisma migrate deploy` (generate the
# migration files locally against a dev database first).
#
# `db:seed` runs on every boot too — every write in prisma/seed.ts is an
# upsert, so re-running it against data that already exists is a no-op, not
# a duplicate. This is what creates/keeps the demo (owner@demo.com) and
# platform-admin (admin@leadflow.com) accounts and the Starter/Growth/Pro
# plans present without a manual `railway run` step after each deploy.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate && npm run db:seed && node server.js"]
