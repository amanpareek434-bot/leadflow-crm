import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";

// DELETE /api/integrations/webhooks/[id] — remove a webhook subscription
// (cascade-deletes its delivery log rows per schema).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();

    const existing = await prisma.webhookSubscription.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    await prisma.webhookSubscription.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("DELETE /api/integrations/webhooks/[id] failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
