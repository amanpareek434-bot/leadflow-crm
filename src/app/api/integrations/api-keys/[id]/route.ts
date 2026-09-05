import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";

// DELETE /api/integrations/api-keys/[id] — "Revoke" button. Soft-revoke
// (sets revokedAt) rather than deleting the row, so past usage/audit history
// (lastUsedAt, createdAt) is preserved and verifyApiKey's `revokedAt: null`
// check immediately stops the key from authenticating.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();

    const existing = await prisma.apiKey.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "API key not found" }, { status: 404 });

    await prisma.apiKey.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("DELETE /api/integrations/api-keys/[id] failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
