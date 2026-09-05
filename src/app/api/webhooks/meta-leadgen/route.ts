import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptJson } from "@/lib/encryption";
import { adsSyncQueue } from "@/lib/queue/queues";

// GET /api/webhooks/meta-leadgen — Meta's webhook verification handshake.
// Called once when you register/verify the callback URL in the Meta app dashboard.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type MetaLeadgenPayload = {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: { leadgen_id?: string; form_id?: string; page_id?: string };
    }>;
  }>;
};

// POST /api/webhooks/meta-leadgen — real-time new-lead notification. Meta only
// tells us leadgen_id/form_id/page_id here, not the lead's actual field data,
// so rather than duplicating fetchLeadsForForm's pagination/field-mapping
// logic (already built in sync.ts) for a single lead, we just re-trigger a
// normal ads-sync for whichever org owns that form — it will pick up the new
// lead (and any others) via fetchLeadsForForm. Always ack fast; never throw.
export async function POST(req: Request) {
  try {
    const payload = (await req.json().catch(() => null)) as MetaLeadgenPayload | null;
    const formIds = new Set<string>();
    for (const entry of payload?.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const formId = change.value?.form_id;
        if (formId) formIds.add(formId);
      }
    }

    if (formIds.size > 0) {
      const integrations = await prisma.integration.findMany({
        where: { type: "META_ADS", status: "CONNECTED", credentials: { not: null } },
      });

      const orgsToSync = new Set<string>();
      for (const integration of integrations) {
        if (!integration.credentials) continue;
        try {
          const creds = decryptJson<{ formIds?: string[] }>(integration.credentials);
          if ((creds.formIds ?? []).some((f) => formIds.has(f))) {
            orgsToSync.add(integration.organizationId);
          }
        } catch (err) {
          console.error("Failed to decrypt META_ADS credentials during leadgen webhook lookup", err);
        }
      }

      for (const organizationId of orgsToSync) {
        await adsSyncQueue()
          .add("sync", { organizationId, integrationType: "META_ADS" })
          .catch((err) => console.error("Failed to enqueue Meta ads sync from leadgen webhook", err));
      }
    }
  } catch (err) {
    console.error("POST /api/webhooks/meta-leadgen failed", err);
  }

  // Always 200 quickly — Meta retries aggressively on non-2xx.
  return NextResponse.json({ ok: true });
}
