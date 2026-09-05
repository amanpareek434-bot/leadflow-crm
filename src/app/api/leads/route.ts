import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertUnderLeadLimit, incrementUsage } from "@/lib/limits";
import { emitEvent } from "@/lib/webhooks";
import { ForbiddenError } from "@/lib/rbac";
import type { LeadStatus } from "@prisma/client";

// GET /api/leads?status=NEW — list the caller's org leads, most recent first.
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as LeadStatus | null;

    const leads = await prisma.lead.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(status ? { status } : {}),
      },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ leads, total: leads.length });
  } catch (err) {
    console.error("GET /api/leads failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  company: z.string().max(200).optional().or(z.literal("")),
  value: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  assignedToId: z.string().optional().or(z.literal("")),
});

// POST /api/leads — manually create a lead ("Add Lead" dialog).
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { name, email, phone, company, value, tags, assignedToId } = parsed.data;
    const organizationId = session.user.organizationId;

    await assertUnderLeadLimit(organizationId);

    const lead = await prisma.lead.create({
      data: {
        organizationId,
        name,
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
        value,
        tags: tags ?? [],
        assignedToId: assignedToId || undefined,
        source: "MANUAL",
      },
    });

    await incrementUsage(organizationId, "leads");
    await emitEvent(organizationId, "lead.created", { leadId: lead.id, name: lead.name, status: lead.status });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (err: any) {
    if (err?.name === "PlanLimitError") {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/leads failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
