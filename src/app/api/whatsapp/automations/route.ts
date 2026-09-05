import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole, ForbiddenError } from "@/lib/rbac";
import type { LeadStatus } from "@prisma/client";

const ALL_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "WON", "LOST", "DEAD"];

// GET /api/whatsapp/automations — one row per LeadStatus with whichever rule
// exists (or null), plus the org's APPROVED templates to populate the pickers.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const organizationId = session.user.organizationId;

    const [rules, templates] = await Promise.all([
      prisma.automationRule.findMany({
        where: { organizationId },
        include: { template: true },
      }),
      prisma.whatsAppTemplate.findMany({
        where: { organizationId, status: "APPROVED" },
        orderBy: { name: "asc" },
      }),
    ]);

    const rows = ALL_STATUSES.map((status) => ({
      triggerStatus: status,
      rule: rules.find((r) => r.triggerStatus === status) ?? null,
    }));

    return NextResponse.json({ rows, templates });
  } catch (err) {
    console.error("GET /api/whatsapp/automations failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

const putSchema = z.object({
  triggerStatus: z.enum(["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "WON", "LOST", "DEAD"]),
  templateId: z.string().min(1).nullable(),
  delayMinutes: z.number().int().min(0).max(10080).default(0),
  isActive: z.boolean().default(true),
});

// PUT /api/whatsapp/automations — upsert (or delete, if templateId is null)
// the single rule for a given trigger status. Admin+ only.
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(session.user.role, "ADMIN")) {
      throw new ForbiddenError("Only admins can manage WhatsApp automations");
    }

    const body = await req.json().catch(() => null);
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { triggerStatus, templateId, delayMinutes, isActive } = parsed.data;
    const organizationId = session.user.organizationId;

    if (!templateId) {
      await prisma.automationRule.deleteMany({ where: { organizationId, triggerStatus } });
      return NextResponse.json({ rule: null });
    }

    // Make sure the template belongs to this org.
    const template = await prisma.whatsAppTemplate.findFirst({ where: { id: templateId, organizationId } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 400 });
    }

    const rule = await prisma.automationRule.upsert({
      where: { organizationId_triggerStatus: { organizationId, triggerStatus } },
      update: { templateId, delayMinutes, isActive },
      create: { organizationId, triggerStatus, templateId, delayMinutes, isActive },
    });

    return NextResponse.json({ rule });
  } catch (err: any) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("PUT /api/whatsapp/automations failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
