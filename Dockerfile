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

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

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

CMD ["node", "server.js"]
