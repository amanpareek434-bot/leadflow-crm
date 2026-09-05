import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptJson } from "@/lib/encryption";
import { verifyShopifyWebhook } from "@/lib/integrations/shopify";
import { adsSyncQueue } from "@/lib/queue/queues";

// POST /api/webhooks/shopify — orders/customers create|update topics all land
// here (configure the same URL for whichever topics you subscribe to in the
// Shopify Partner dashboard / via the Admin API). We verify the HMAC first
// (raw body required for that, so req.text() before any JSON parsing), then
// look up which org this shop belongs to and re-trigger a normal ads-sync
// rather than duplicating fetchRecentCustomers/fetchRecentOrders' upsert
// logic (already built in sync.ts) per webhook topic.
export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhook(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const shop = req.headers.get("x-shopify-shop-domain")?.trim().toLowerCase();
    if (shop) {
      const integrations = await prisma.integration.findMany({
        where: { type: "SHOPIFY", status: "CONNECTED", credentials: { not: null } },
      });

      for (const integration of integrations) {
        if (!integration.credentials) continue;
        try {
          const creds = decryptJson<{ shop?: string }>(integration.credentials);
          if (creds.shop?.toLowerCase() === shop) {
            await adsSyncQueue()
              .add("sync", { organizationId: integration.organizationId, integrationType: "SHOPIFY" })
              .catch((err) => console.error("Failed to enqueue Shopify sync from webhook", err));
            break;
          }
        } catch (err) {
          console.error("Failed to decrypt SHOPIFY credentials during webhook lookup", err);
        }
      }
    }
  } catch (err) {
    console.error("POST /api/webhooks/shopify failed", err);
  }

  // Always 200 quickly (once signature is verified) — Shopify retries/disables
  // webhooks that don't ack promptly.
  return NextResponse.json({ ok: true });
}
