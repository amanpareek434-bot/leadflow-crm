import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";
import { adsSyncQueue } from "@/lib/queue/queues";

const SYNCABLE = ["META_ADS", "GOOGLE_ADS", "SHOPIFY"] as const;
type Syncable = (typeof SYNCABLE)[number];

// POST /api/integrations/META_ADS/sync (or GOOGLE_ADS / SHOPIFY) — "Sync now"
// button. Just enqueues the job; the already-built worker (src/worker/index.ts)
// picks it up and calls runAdsSyncForOrg, keeping this request fast.
export async function POST(_req: Request, { params }: { params: { type: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();

    const type = params.type;
    if (!SYNCABLE.includes(type as Syncable)) {
      return NextResponse.json({ error: "Unsupported integration type for sync" }, { status: 400 });
    }

    await adsSyncQueue().add("sync", {
      organizationId: session.user.organizationId,
      integrationType: type as Syncable,
    });

    return NextResponse.json({ ok: true, queued: true }, { status: 202 });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("POST /api/integrations/[type]/sync failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
