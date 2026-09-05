import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/deals — list the org's deals with their lead's name included.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const deals = await prisma.deal.findMany({
      where: { organizationId: session.user.organizationId },
      include: { lead: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ deals, total: deals.length });
  } catch (err) {
    console.error("GET /api/deals failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

const createDealSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  leadId: z.string().min(1, "Lead is required"),
  valuePaise: z.number().int().nonnegative().default(0),
});

// POST /api/deals — create a deal linked to one of the org's own leads.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = session.user.organizationId;

    const body = await req.json().catch(() => null);
    const parsed = createDealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { title, leadId, valuePaise } = parsed.data;

    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const deal = await prisma.deal.create({
      data: { organizationId, leadId: lead.id, title, valuePaise },
      include: { lead: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch (err) {
    console.error("POST /api/deals failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
