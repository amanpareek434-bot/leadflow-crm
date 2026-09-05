import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";
import { encryptJson, decryptJson } from "@/lib/encryption";
import type { WhatsAppCredentials } from "@/lib/integrations/whatsapp";

const schema = z.object({
  phoneNumberId: z.string().min(1).max(100),
  businessAccountId: z.string().min(1).max(100),
  // Optional: omitted/blank means "keep the access token already on file".
  accessToken: z.string().min(1).max(2000).optional(),
});

// PATCH /api/integrations/whatsapp/settings — each org connects their OWN
// WhatsApp Business number here (no OAuth flow for WhatsApp Cloud API — the
// values come from the org's own Meta app). Unlike Meta Ads/Google Ads/Shopify
// there's no prior "Connect" step, so this both creates and updates the row.
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();
    const organizationId = session.user.organizationId;

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { phoneNumberId, businessAccountId, accessToken } = parsed.data;

    const existing = await prisma.integration.findUnique({
      where: { organizationId_type: { organizationId, type: "WHATSAPP" } },
    });
    const priorCreds = existing?.credentials ? decryptJson<Partial<WhatsAppCredentials>>(existing.credentials) : {};

    const resolvedAccessToken = accessToken ?? priorCreds.accessToken;
    if (!resolvedAccessToken) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 });
    }

    const credentials: WhatsAppCredentials = { phoneNumberId, businessAccountId, accessToken: resolvedAccessToken };

    await prisma.integration.upsert({
      where: { organizationId_type: { organizationId, type: "WHATSAPP" } },
      update: { status: "CONNECTED", credentials: encryptJson(credentials), lastError: null },
      create: { organizationId, type: "WHATSAPP", status: "CONNECTED", credentials: encryptJson(credentials) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("PATCH /api/integrations/whatsapp/settings failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// POST /api/integrations/whatsapp/settings — disconnect (clears credentials).
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();

    await prisma.integration.updateMany({
      where: { organizationId: session.user.organizationId, type: "WHATSAPP" },
      data: { status: "NOT_CONNECTED", credentials: null },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("DELETE /api/integrations/whatsapp/settings failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
