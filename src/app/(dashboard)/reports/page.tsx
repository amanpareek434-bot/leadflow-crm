import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { LEAD_STATUS_LABELS } from "@/lib/utils";
import { Download, FileText } from "lucide-react";
import { ReportsCharts, type NamedCount, type AdsTrendPoint } from "./reports-charts";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;
  const since30d = new Date(Date.now() - 30 * 86400_000);

  const [
    leadsByStatusRaw,
    leadsBySourceRaw,
    leadsLast30Days,
    whatsappByStatusRaw,
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
    prisma.deal.aggregate({ where: { organizationId, won: true }, _sum: { valuePaise: true }, _count: true }),
    prisma.deal.aggregate({ where: { organizationId, won: false }, _sum: { valuePaise: true }, _count: true }),
  ]);

  const leadsByDayMap = new Map<string, number>();
  for (const l of leadsLast30Days) {
    const key = l.createdAt.toISOString().slice(0, 10);
    leadsByDayMap.set(key, (leadsByDayMap.get(key) ?? 0) + 1);
  }
  const leadsTrend = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000);
    const key = d.toISOString().slice(0, 10);
    return { date: key.slice(5), leads: leadsByDayMap.get(key) ?? 0 };
  });

  const leadsByStatus: NamedCount[] = leadsByStatusRaw.map((s) => ({
    name: LEAD_STATUS_LABELS[s.status] ?? s.status,
    value: s._count,
  }));
  const leadsBySource: NamedCount[] = leadsBySourceRaw.map((s) => ({
    name: s.source,
    value: s._count,
  }));

  // Sum ad spend by platform+day for the last 30 days.
  const adsByDay = new Map<string, { META_ADS: number; GOOGLE_ADS: number }>();
  for (const row of adInsights) {
    const key = row.date.toISOString().slice(0, 10);
    const entry = adsByDay.get(key) ?? { META_ADS: 0, GOOGLE_ADS: 0 };
    if (row.platform === "META_ADS") entry.META_ADS += row.spendPaise;
    else if (row.platform === "GOOGLE_ADS") entry.GOOGLE_ADS += row.spendPaise;
    adsByDay.set(key, entry);
  }
  const adsTrend: AdsTrendPoint[] = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000);
    const key = d.toISOString().slice(0, 10);
    const entry = adsByDay.get(key) ?? { META_ADS: 0, GOOGLE_ADS: 0 };
    return {
      date: key.slice(5),
      META_ADS: Math.round(entry.META_ADS / 100),
      GOOGLE_ADS: Math.round(entry.GOOGLE_ADS / 100),
    };
  });

  const whatsappCounts = Object.fromEntries(whatsappByStatusRaw.map((w) => [w.status, w._count])) as Record<string, number>;
  const whatsappTotal = whatsappByStatusRaw.reduce((sum, w) => sum + w._count, 0);
  const whatsappStats = {
    total: whatsappTotal,
    delivered: whatsappCounts.DELIVERED ?? 0,
    read: whatsappCounts.READ ?? 0,
    failed: whatsappCounts.FAILED ?? 0,
  };

  const wonCount = wonDeals._count;
  const lostCount = lostDeals._count;
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;
  const dealStats = {
    wonValuePaise: wonDeals._sum.valuePaise ?? 0,
    wonCount,
    lostValuePaise: lostDeals._sum.valuePaise ?? 0,
    lostCount,
    winRate,
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Lead, WhatsApp, ads, and deal performance across your organization."
        actions={
          <>
            <a href="/api/reports/export?format=csv&type=leads" download>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </a>
            <a href="/api/reports/export?format=pdf&type=leads" download>
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" /> Export PDF
              </Button>
            </a>
          </>
        }
      />

      <ReportsCharts
        leadsByStatus={leadsByStatus}
        leadsBySource={leadsBySource}
        leadsTrend={leadsTrend}
        adsTrend={adsTrend}
        whatsappStats={whatsappStats}
        dealStats={dealStats}
      />
    </div>
  );
}
