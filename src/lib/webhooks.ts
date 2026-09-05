import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { webhookQueue } from "@/lib/queue/queues";

/**
 * Outgoing event bus. Call `emitEvent` whenever something a customer's ERP /
 * Google Sheet / Zapier-style automation might care about happens (lead
 * created, status changed, deal won...). It fans out to every active
 * WebhookSubscription the org has registered for that event, queued via
 * BullMQ so a slow/broken receiving endpoint never blocks the request.
 */

export type CrmEvent =
  | "lead.created"
  | "lead.status_changed"
  | "deal.won"
  | "deal.lost"
  | "whatsapp.message_status";

export async function emitEvent(organizationId: string, event: CrmEvent, payload: Record<string, unknown>) {
  const subs = await prisma.webhookSubscription.findMany({
    where: { organizationId, isActive: true, events: { has: event } },
  });
  if (subs.length === 0) return;

  const body = { event, data: payload, sentAt: new Date().toISOString() };

  for (const sub of subs) {
    try {
      await webhookQueue().add(
        "deliver",
        { subscriptionId: sub.id, event, payload: body, attempt: 1 },
        { attempts: 5, backoff: { type: "exponential", delay: 5000 } }
      );
    } catch (err) {
      // Redis not configured (e.g. local dev without a Redis instance) — don't
      // fail the request that triggered the event, just skip delivery.
      console.error("webhook enqueue failed", err);
    }
  }
}

/** HMAC-SHA256 signature sent as the `X-CRM-Signature` header so receivers can verify authenticity. */
export function signPayload(secret: string, rawBody: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

export async function deliverWebhook(subscriptionId: string, payload: Record<string, unknown>, attempt: number) {
  const sub = await prisma.webhookSubscription.findUnique({ where: { id: subscriptionId } });
  if (!sub || !sub.isActive) return;

  const rawBody = JSON.stringify(payload);
  const signature = signPayload(sub.secret, rawBody);

  try {
    const res = await fetch(sub.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CRM-Signature": signature },
      body: rawBody,
    });
    await prisma.webhookDeliveryLog.create({
      data: {
        subscriptionId,
        event: (payload as any).event ?? "unknown",
        payload: payload as any,
        status: res.ok ? "SUCCESS" : "FAILED",
        responseCode: res.status,
        attempt,
      },
    });
    if (!res.ok) throw new Error(`Webhook receiver returned ${res.status}`);
  } catch (err) {
    await prisma.webhookDeliveryLog.create({
      data: {
        subscriptionId,
        event: (payload as any).event ?? "unknown",
        payload: payload as any,
        status: "FAILED",
        responseCode: null,
        attempt,
      },
    });
    throw err; // let BullMQ retry with backoff
  }
}
