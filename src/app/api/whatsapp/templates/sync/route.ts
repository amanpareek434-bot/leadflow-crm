import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole, ForbiddenError } from "@/lib/rbac";
import { fetchApprovedTemplates, getWhatsAppCredentialsForOrg } from "@/lib/integrations/whatsapp";
import type { WhatsAppTemplateStatus } from "@prisma/client";

function mapStatus(status: string): WhatsAppTemplateStatus {
  const upper = (status ?? "").toUpperCase();
  if (upper === "APPROVED" || upper === "REJECTED") return upper;
  return "PENDING";
}

// POST /api/whatsapp/templates/sync — pull templates from the connected Meta
// WhatsApp Business Account and upsert them into our local table.
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(session.user.role, "ADMIN")) {
      throw new ForbiddenError("Only admins can sync WhatsApp templates");
    }

    const organizationId = session.user.organizationId;

    let metaTemplates;
    try {
      const creds = await getWhatsAppCredentialsForOrg(organizationId);
      metaTemplates = await fetchApprovedTemplates(creds);
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message ?? "Connect WhatsApp in Integrations first" },
        { status: 400 }
      );
    }

    let synced = 0;
    for (const t of metaTemplates) {
      const bodyComponent = t.components?.find((c) => c.type === "BODY" || c.type === "body");
      const bodyText = bodyComponent?.text ?? "";
      const variables = Array.from(new Set(Array.from(bodyText.matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((m) => m[1])));

      const existing = await prisma.whatsAppTemplate.findFirst({
        where: { organizationId, metaTemplateId: t.id },
      });

      if (existing) {
        await prisma.whatsAppTemplate.update({
          where: { id: existing.id },
          data: {
            name: t.name,
            language: t.language,
            category: t.category,
            bodyText,
            variables,
            status: mapStatus(t.status),
          },
        });
      } else {
        await prisma.whatsAppTemplate.create({
          data: {
            organizationId,
            metaTemplateId: t.id,
            name: t.name,
            language: t.language,
            category: t.category,
            bodyText,
            variables,
            status: mapStatus(t.status),
          },
        });
      }
      synced += 1;
    }

    return NextResponse.json({ synced });
  } catch (err: any) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/whatsapp/templates/sync failed", err);
    return NextResponse.json({ error: err?.message ?? "Something went wrong" }, { status: 500 });
  }
}
