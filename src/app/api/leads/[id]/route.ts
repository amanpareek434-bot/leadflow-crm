import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleLeadStatusChange } from "@/lib/automation";
import { LEAD_STATUS_LABELS } from "@/lib/utils";
import { ForbiddenError } from "@/lib/rbac";

// GET /api/leads/[id] — single lead, scoped to the caller's org.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const lead = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    return NextResponse.json({ lead });
  } catch (err) {
    console.error("GET /api/leads/[id] failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

const patchLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(30).nullable().optional().or(z.literal("")),
  company: z.string().max(200).nullable().optional().or(z.literal("")),
  value: z.number().int().nonnegative().nullable().optional(),
  assignedToId: z.string().nullable().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "WON", "LOST", "DEAD"]).optional(),
});

// PATCH /api/leads/[id] — edit fields and/or change status.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = session.user.organizationId;

    const existing = await prisma.lead.findFirst({ where: { id: params.id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = patchLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { name, email, phone, company, value, assignedToId, tags, status } = parsed.data;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email || null;
    if (phone !== undefined) data.phone = phone || null;
    if (company !== undefined) data.company = company || null;
    if (value !== undefined) data.value = value;
    if (assignedToId !== undefined) data.assignedToId = assignedToId || null;
    if (tags !== undefined) data.tags = tags;
    if (status !== undefined) data.status = status;

    const lead = await prisma.lead.update({ where: { id: existing.id }, data });

    if (status && status !== existing.status) {
      await prisma.activity.create({
        data: {
          organizationId,
          leadId: lead.id,
          userId: session.user.id,
          type: "STATUS_CHANGE",
          body: `Status changed from ${LEAD_STATUS_LABELS[existing.status]} to ${LEAD_STATUS_LABELS[status]}`,
        },
      });
      await handleLeadStatusChange(lead.id, organizationId, status);
    }

    return NextResponse.json({ lead });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("PATCH /api/leads/[id] failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// DELETE /api/leads/[id] — cascade deletes activities/deals per schema.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    await prisma.lead.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/leads/[id] failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
