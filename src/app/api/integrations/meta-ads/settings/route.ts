import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";
import { encryptJson, decryptJson } from "@/lib/encryption";

const schema = z.object({
  adAccountId: z.string().max(100).optional(),
  formIds: z.array(z.string().max(100)).optional(),
});

// PATCH /api/integrations/meta-ads/settings — set the Ad Account id / Lead Ads
// form ids that runAdsSyncForOrg (already built, src/lib/integrations/sync.ts)
// reads out of the decrypted credentials blob. We re-read + re-encrypt rather
// than touching `settings` so the sync code's single source of truth
// (decrypted credentials) stays consistent.
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
      where: { organizationId_type: { organizationId, type: "META_ADS" } },
    });
    if (!integration || !integration.credentials) {
      return NextResponse.json({ error: "Connect Meta Ads first" }, { status: 400 });
    }

    const creds = decryptJson<Record<string, any>>(integration.credentials);
    const merged = {
      ...creds,
      ...(parsed.data.adAccountId !== undefined ? { adAccountId: parsed.data.adAccountId } : {}),
      ...(parsed.data.formIds !== undefined ? { formIds: parsed.data.formIds } : {}),
    };

    await prisma.integration.update({
      where: { id: integration.id },
      data: { credentials: encryptJson(merged) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("PATCH /api/integrations/meta-ads/settings failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
