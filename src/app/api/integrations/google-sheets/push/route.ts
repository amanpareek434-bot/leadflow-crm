import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageIntegrations, ForbiddenError } from "@/lib/rbac";
import { decryptJson } from "@/lib/encryption";
import { refreshGoogleAccessToken } from "@/lib/integrations/google-ads";
import { pushLeadToSheet } from "@/lib/integrations/google-sheets";

// POST /api/integrations/google-sheets/push — manual "push my leads to my
// Sheet" button. Pulls the org's most recent 50 leads and appends one row per
// lead. refreshGoogleAccessToken is generic OAuth (works for any Google
// scope, including Sheets) despite living in google-ads.ts.
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageIntegrations(session.user.role)) throw new ForbiddenError();
    const organizationId = session.user.organizationId;

    const integration = await prisma.integration.findUnique({
      where: { organizationId_type: { organizationId, type: "GOOGLE_SHEETS" } },
    });
    if (!integration || integration.status !== "CONNECTED" || !integration.credentials) {
      return NextResponse.json({ error: "Connect Google Sheets first" }, { status: 400 });
    }

    const creds = decryptJson<{ refreshToken: string; spreadsheetId: string; sheetName: string }>(
      integration.credentials
    );
    if (!creds.spreadsheetId) {
      return NextResponse.json({ error: "Set a spreadsheet ID first" }, { status: 400 });
    }

    const leads = await prisma.lead.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const { access_token } = await refreshGoogleAccessToken(creds.refreshToken);

    let pushed = 0;
    for (const lead of leads) {
      await pushLeadToSheet(access_token, creds.spreadsheetId, creds.sheetName || "Leads", {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        source: lead.source,
        createdAt: lead.createdAt,
      });
      pushed++;
    }

    await prisma.integration.update({ where: { id: integration.id }, data: { lastSyncedAt: new Date(), lastError: null } });

    return NextResponse.json({ ok: true, pushed });
  } catch (err: any) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("POST /api/integrations/google-sheets/push failed", err);
    return NextResponse.json({ error: err?.message ?? "Something went wrong" }, { status: 500 });
  }
}
