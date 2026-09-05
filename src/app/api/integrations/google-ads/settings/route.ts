import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";
import { encryptJson, decryptJson } from "@/lib/encryption";

const schema = z.object({
  customerId: z.string().max(50),
});

// PATCH /api/integrations/google-ads/settings — set the Google Ads customer id
// runAdsSyncForOrg reads out of decrypted credentials.
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

    const integration = await prisma.integration.findUnique({
      where: { organizationId_type: { organizationId, type: "GOOGLE_ADS" } },
    });
    if (!integration || !integration.credentials) {
      return NextResponse.json({ error: "Connect Google Ads first" }, { status: 400 });
    }

    const creds = decryptJson<Record<string, any>>(integration.credentials);
    const merged = { ...creds, customerId: parsed.data.customerId };

    await prisma.integration.update({
      where: { id: integration.id },
      data: { credentials: encryptJson(merged) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("PATCH /api/integrations/google-ads/settings failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
