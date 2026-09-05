import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { extractBearerToken, verifyApiKey } from "@/lib/api-keys";

// GET /api/v1/leads/[id] — single lead, scoped to the API key's organization.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const token = extractBearerToken(req.headers.get("authorization"));
    const apiKey = await verifyApiKey(token);
    if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const lead = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: apiKey.organizationId },
    });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    return NextResponse.json({ lead });
  } catch (err) {
    console.error("GET /api/v1/leads/[id] failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "WON", "LOST", "DEAD"]).optional(),
});

// PATCH /api/v1/leads/[id] — basic field updates from an external system.
// NOTE: intentionally does NOT trigger the WhatsApp status-change automation
// that the dashboard's PATCH /api/leads/[id] route runs (handleLeadStatusChange
// in src/lib/automation.ts) — importing that here would couple this public,
// API-key-authenticated surface to internal automation wiring owned by
// another module. Acceptable v1 limitation: status changes made via the
// public API don't fire WhatsApp automations, only dashboard-made ones do.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const token = extractBearerToken(req.headers.get("authorization"));
    const apiKey = await verifyApiKey(token);
    if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: apiKey.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { name, email, phone, status } = parsed.data;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (status !== undefined) data.status = status;

    const lead = await prisma.lead.update({ where: { id: existing.id }, data });

    return NextResponse.json({ lead });
  } catch (err) {
    console.error("PATCH /api/v1/leads/[id] failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
