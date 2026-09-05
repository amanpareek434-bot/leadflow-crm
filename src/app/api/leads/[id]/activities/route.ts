import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const activitySchema = z.object({
  body: z.string().min(1, "Note can't be empty").max(4000),
  type: z.enum(["NOTE", "CALL", "EMAIL", "STATUS_CHANGE", "WHATSAPP", "SYSTEM"]).optional(),
});

// POST /api/leads/[id]/activities — add a timeline entry (defaults to a NOTE).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = session.user.organizationId;

    const lead = await prisma.lead.findFirst({ where: { id: params.id, organizationId } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = activitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const activity = await prisma.activity.create({
      data: {
        organizationId,
        leadId: lead.id,
        userId: session.user.id,
        type: parsed.data.type ?? "NOTE",
        body: parsed.data.body,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (err) {
    console.error("POST /api/leads/[id]/activities failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
