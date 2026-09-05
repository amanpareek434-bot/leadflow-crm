import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/reports/summary — aggregate data backing the Reports page. The
// Server Component fetches this data directly via Prisma for performance;
// this route exists as a reasonable API surface for client-side refreshes.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = session.user.organizationId;

    const since30d = new Date(Date.now() - 30 * 86400_000);

    const [
      leadsByStatus,
      leadsBySource,
      leadsLast30Days,
      whatsappByStatus,
      adInsights,
      wonDeals,
      lostDeals,
    ] = await Promise.all([
      prisma.lead.groupBy({ by: ["status"], where: { organizationId }, _count: true }),
      prisma.lead.groupBy({ by: ["source"], where: { organizationId }, _count: true }),
      prisma.lead.findMany({
        where: { organizationId, createdAt: { gte: since30d } },
        select: { createdAt: true },
      }),
      prisma.whatsAppMessageLog.groupBy({ by: ["status"], where: { organizationId, direction: "OUTBOUND" }, _count: true }),
      prisma.adInsight.findMany({
        where: { organizationId, date: { gte: since30d } },
        select: { platform: true, date: true, spendPaise: true, clicks: true, conversions: true },
      }),
      prisma.deal.aggregate({
        where: { organizationId, won: true },
        _sum: { valuePaise: true },
        _count: true,
      }),
      prisma.deal.aggregate({
        where: { organizationId, won: false },
        _sum: { valuePaise: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      leadsByStatus,
      leadsBySource,
      leadsLast30Days,
      whatsappByStatus,
      adInsights,
      deals: {
        wonValuePaise: wonDeals._sum.valuePaise ?? 0,
        wonCount: wonDeals._count,
        lostValuePaise: lostDeals._sum.valuePaise ?? 0,
        lostCount: lostDeals._count,
      },
    });
  } catch (err) {
    console.error("GET /api/reports/summary failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
