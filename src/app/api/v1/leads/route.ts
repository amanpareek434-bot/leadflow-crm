import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { extractBearerToken, verifyApiKey } from "@/lib/api-keys";
import { emitEvent } from "@/lib/webhooks";
import type { LeadStatus } from "@prisma/client";

const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "WON", "LOST", "DEAD"] as const;

// GET /api/v1/leads?status=NEW&since=2026-01-01 — public outgoing REST API for
// a customer's own ERP/scripts. Authenticated via `Authorization: Bearer
// crm_live_xxx`, NOT a browser session.
export async function GET(req: Request) {
  try {
    const token = extractBearerToken(req.headers.get("authorization"));
    const apiKey = await verifyApiKey(token);
    if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const status = LEAD_STATUSES.includes(statusParam as LeadStatus) ? (statusParam as LeadStatus) : undefined;
    const sinceParam = searchParams.get("since");
    const since = sinceParam && !Number.isNaN(Date.parse(sinceParam)) ? new Date(sinceParam) : undefined;

    const leads = await prisma.lead.findMany({
      where: {
        organizationId: apiKey.organizationId,
        ...(status ? { status } : {}),
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ leads, total: leads.length });
  } catch (err) {
    console.error("GET /api/v1/leads failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().max(30).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
});

// POST /api/v1/leads — create a lead from an external system (ERP, form
// backend, etc.). source is always "API" so these are distinguishable from
// dashboard-created ("MANUAL") or platform-synced leads.
export async function POST(req: Request) {
  try {
    const token = extractBearerToken(req.headers.get("authorization"));
    const apiKey = await verifyApiKey(token);
    if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId: apiKey.organizationId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        status: parsed.data.status ?? "NEW",
        source: "API",
      },
    });

    await emitEvent(apiKey.organizationId, "lead.created", { leadId: lead.id, name: lead.name, status: lead.status });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    console.error("POST /api/v1/leads failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
