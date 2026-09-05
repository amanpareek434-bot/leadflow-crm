import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STATUS_LABELS, formatNumber } from "@/lib/utils";
import { OverviewCharts } from "./overview-charts";
import { Users2, MessageCircle, Trophy, TrendingDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const [totalLeads, wonLeads, lostLeads, whatsappSent, statusBreakdown, last30DaysLeads] = await Promise.all([
    prisma.lead.count({ where: { organizationId } }),
    prisma.lead.count({ where: { organizationId, status: "WON" } }),
    prisma.lead.count({ where: { organizationId, status: "LOST" } }),
    prisma.whatsAppMessageLog.count({ where: { organizationId, direction: "OUTBOUND" } }),
    prisma.lead.groupBy({ by: ["status"], where: { organizationId }, _count: true }),
    prisma.lead.findMany({
      where: { organizationId, createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
      select: { createdAt: true },
    }),
  ]);

  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  const statusData = statusBreakdown.map((s) => ({
    name: LEAD_STATUS_LABELS[s.status] ?? s.status,
    value: s._count,
  }));

  const dailyMap = new Map<string, number>();
  for (const l of last30DaysLeads) {
    const key = l.createdAt.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const trendData = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000);
    const key = d.toISOString().slice(0, 10);
    return { date: key.slice(5), leads: dailyMap.get(key) ?? 0 };
  });

  const stats = [
    { label: "Total leads", value: formatNumber(totalLeads), icon: Users2, color: "text-accent-blue bg-accent-blue/10" },
    { label: "Won", value: formatNumber(wonLeads), icon: Trophy, color: "text-success bg-success/10" },
    { label: "Lost", value: formatNumber(lostLeads), icon: TrendingDown, color: "text-accent-rose bg-accent-rose/10" },
    { label: "WhatsApp sent", value: formatNumber(whatsappSent), icon: MessageCircle, color: "text-accent-teal bg-accent-teal/10" },
  ];

  return (
    <div>
      <PageHeader title="Overview" description={`Conversion rate: ${conversionRate}% · Welcome back, ${session!.user.name}`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <OverviewCharts statusData={statusData} trendData={trendData} />
    </div>
  );
}
