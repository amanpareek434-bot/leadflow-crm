import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";
import type { IntegrationType } from "@prisma/client";

const DISCONNECTABLE = ["META_ADS", "GOOGLE_ADS", "SHOPIFY", "GOOGLE_SHEETS"] as const;
type Disconnectable = (typeof DISCONNECTABLE)[number];

// POST /api/integrations/META_ADS/disconnect (etc.) — resets the Integration
// row to NOT_CONNECTED and wipes the encrypted credentials. WhatsApp is
// excluded: it's configured via env vars for this deployment, not per-org OAuth.
export async function POST(_req: Request, { params }: { params: { type: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();

    const type = params.type;
    if (!DISCONNECTABLE.includes(type as Disconnectable)) {
      return NextResponse.json({ error: "Unsupported integration type" }, { status: 400 });
    }

    await prisma.integration.updateMany({
      where: { organizationId: session.user.organizationId, type: type as IntegrationType },
      data: { status: "NOT_CONNECTED", credentials: null, lastError: null, lastSyncedAt: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("POST /api/integrations/[type]/disconnect failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
