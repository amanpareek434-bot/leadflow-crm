import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/stats — platform-wide aggregates for the admin overview page.
// Cross-tenant by design: gated on session.user.isPlatformAdmin, never on organizationId.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.user.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [totalOrganizations, totalUsers, totalLeads, activeSubscriptionsCount, activeSubscriptions, whatsappSent] =
      await Promise.all([
        prisma.organization.count(),
        prisma.user.count(),
        prisma.lead.count(),
        prisma.subscription.count({ where: { status: "ACTIVE" } }),
        prisma.subscription.findMany({ where: { status: "ACTIVE" }, include: { plan: true } }),
        prisma.whatsAppMessageLog.count({ where: { direction: "OUTBOUND" } }),
      ]);

    const mrrPaise = activeSubscriptions.reduce((sum, s) => sum + (s.plan?.priceMonthlyPaise ?? 0), 0);

    return NextResponse.json({
      totalOrganizations,
      totalUsers,
      totalLeads,
      activeSubscriptionsCount,
      mrrPaise,
      whatsappSent,
    });
  } catch (err) {
    console.error("GET /api/admin/stats failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
