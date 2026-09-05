import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMetaSignature } from "@/lib/integrations/whatsapp";
import { emitEvent } from "@/lib/webhooks";
import type { MessageStatus } from "@prisma/client";

// This route is called directly by Meta's servers — there is NO user session
// here. Authenticity is verified via the X-Hub-Signature-256 HMAC header
// instead (see verifyMetaSignature), not via getSession().

// GET /api/webhooks/whatsapp — Meta's one-time webhook verification handshake.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function mapMetaStatus(status: string): MessageStatus | null {
  switch ((status ?? "").toLowerCase()) {
    case "sent":
      return "SENT";
    case "delivered":
      return "DELIVERED";
    case "read":
      return "READ";
    case "failed":
      return "FAILED";
    default:
      return null;
  }
}

type MetaWebhookValue = {
  statuses?: Array<{ id: string; status: string; recipient_id?: string }>;
  messages?: Array<{ from: string; id: string; text?: { body?: string }; timestamp?: string }>;
};

async function processEntry(value: MetaWebhookValue) {
  // Outbound message status updates (sent/delivered/read/failed).
  for (const s of value.statuses ?? []) {
    const mapped = mapMetaStatus(s.status);
    if (!mapped) continue;

    const log = await prisma.whatsAppMessageLog.findFirst({ where: { waMessageId: s.id } });
    if (!log) {
      console.warn(`whatsapp webhook: no WhatsAppMessageLog found for waMessageId=${s.id}`);
      continue;
    }

    await prisma.whatsAppMessageLog.update({
      where: { id: log.id },
      data: { status: mapped },
    });

    await emitEvent(log.organizationId, "whatsapp.message_status", {
      messageLogId: log.id,
      waMessageId: s.id,
      status: mapped,
      recipient: s.recipient_id,
    });
  }

  // Inbound messages from the customer.
  for (const m of value.messages ?? []) {
    const body = m.text?.body ?? "";
    const fromPhone = m.from;

    // Lead.phone isn't globally unique across tenants — best-effort match to
    // the most recently created Lead with this phone number.
    const lead = await prisma.lead.findFirst({
      where: { phone: fromPhone },
      orderBy: { createdAt: "desc" },
    });

    if (!lead) {
      console.warn(`whatsapp webhook: no Lead found for inbound phone=${fromPhone}, skipping persist`);
      continue;
    }

    await prisma.whatsAppMessageLog.create({
      data: {
        organizationId: lead.organizationId,
        leadId: lead.id,
        direction: "INBOUND",
        toPhone: fromPhone,
        body,
        waMessageId: m.id,
        status: "DELIVERED",
      },
    });
  }
}

// POST /api/webhooks/whatsapp — inbound message + status update notifications.
export async function POST(req: Request) {
  // Always ack fast; Meta retries aggressively on non-200s.
  const rawBody = await req.text();

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const valid = verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"), appSecret);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn("WHATSAPP_APP_SECRET not set — skipping webhook signature verification (dev mode only)");
  }

  try {
    const payload = JSON.parse(rawBody);
    const entries = payload?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value as MetaWebhookValue | undefined;
        if (value) await processEntry(value);
      }
    }
  } catch (err) {
    console.error("whatsapp webhook processing failed", err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
