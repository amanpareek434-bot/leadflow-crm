import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole, ForbiddenError } from "@/lib/rbac";

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
  name: z.string().min(1, "Name is required").max(200),
  language: z.string().min(2).max(20).default("en_US"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).default("MARKETING"),
  bodyText: z.string().min(1, "Body text is required").max(2000),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("APPROVED"),
});

// POST /api/whatsapp/templates — manually register a template that's already
// approved on WhatsApp Business Manager (or record one still pending review).
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(session.user.role, "ADMIN")) {
      throw new ForbiddenError("Only admins can manage WhatsApp templates");
    }

    const body = await req.json().catch(() => null);
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { name, language, category, bodyText, status } = parsed.data;

    const variables = Array.from(new Set(Array.from(bodyText.matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((m) => m[1])));

    const template = await prisma.whatsAppTemplate.create({
      data: {
        organizationId: session.user.organizationId,
        name,
        language,
        category,
        bodyText,
        variables,
        status,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (err: any) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/whatsapp/templates failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
