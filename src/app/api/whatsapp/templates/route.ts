import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole, ForbiddenError } from "@/lib/rbac";
import { createWhatsAppTemplate, getWhatsAppCredentialsForOrg } from "@/lib/integrations/whatsapp";
import type { WhatsAppTemplateStatus } from "@prisma/client";

// GET /api/whatsapp/templates — list the org's WhatsApp templates, newest first.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const templates = await prisma.whatsAppTemplate.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (err) {
    console.error("GET /api/whatsapp/templates failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

const createTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only (e.g. lost_lead_followup)"),
  language: z.string().min(2).max(20).default("en_US"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).default("MARKETING"),
  bodyText: z.string().min(1, "Body text is required").max(2000),
});

function mapMetaStatus(status: string): WhatsAppTemplateStatus {
  const upper = (status ?? "").toUpperCase();
  if (upper === "APPROVED" || upper === "REJECTED") return upper;
  return "PENDING";
}

// POST /api/whatsapp/templates — submits a brand-new template to Meta for
// review (there is no way to self-declare a template "approved": it either
// really is, on Meta's systems, or a send using it will fail regardless of
// what's stored here). Starts out PENDING; use "Sync from WhatsApp" once
// Meta has finished reviewing it to pick up the real approved/rejected status.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(session.user.role, "ADMIN")) {
      throw new ForbiddenError("Only admins can manage WhatsApp templates");
    }
    const organizationId = session.user.organizationId;

    const body = await req.json().catch(() => null);
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { name, language, category, bodyText } = parsed.data;

    const creds = await getWhatsAppCredentialsForOrg(organizationId).catch((err) => {
      throw new Error(err.message);
    });

    const metaResult = await createWhatsAppTemplate(creds, { name, language, category, bodyText });

    const variables = Array.from(new Set(Array.from(bodyText.matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((m) => m[1])));

    const template = await prisma.whatsAppTemplate.create({
      data: {
        organizationId,
        metaTemplateId: metaResult.id,
        name,
        language,
        category,
        bodyText,
        variables,
        status: mapMetaStatus(metaResult.status),
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (err: any) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/whatsapp/templates failed", err);
    return NextResponse.json({ error: err?.message ?? "Something went wrong" }, { status: 400 });
  }
}
