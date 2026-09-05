import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/webhooks";

const patchDealSchema = z.object({
  won: z.boolean(),
});

// PATCH /api/deals/[id] — mark a deal won or lost.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = session.user.organizationId;

    const existing = await prisma.deal.findFirst({ where: { id: params.id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = patchDealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { won } = parsed.data;

    const deal = await prisma.deal.update({
      where: { id: existing.id },
      data: { won, closedAt: new Date() },
      include: { lead: { select: { id: true, name: true } } },
    });

    await emitEvent(organizationId, won ? "deal.won" : "deal.lost", {
      dealId: deal.id,
      leadId: deal.leadId,
      valuePaise: deal.valuePaise,
      title: deal.title,
    });

    return NextResponse.json({ deal });
  } catch (err) {
    console.error("PATCH /api/deals/[id] failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
