import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatPaise } from "@/lib/utils";
import { AdminCharts } from "./admin-charts";
import { Building2, Users2, Users, CreditCard, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  TRIALING: "Trialing",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  NONE: "No subscription",
};

export default async function AdminOverviewPage() {
  // Independent server-side check — this panel is cross-tenant data, so we
  // never rely solely on the /admin layout or the middleware for this.
  const session = await getSession();
  if (!session || !session.user.isPlatformAdmin) redirect("/dashboard");

  const [
    totalOrganizations,
    totalUsers,
    totalLeads,
    activeSubscriptionsCount,
    activeSubscriptions,
    whatsappSent,
    subsByStatus,
    last30DaysOrgs,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.lead.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.findMany({ where: { status: "ACTIVE" }, include: { plan: true } }),
    prisma.whatsAppMessageLog.count({ where: { direction: "OUTBOUND" } }),
    prisma.subscription.groupBy({ by: ["status"], _count: true }),
    prisma.organization.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
      select: { createdAt: true },
    }),
  ]);

  const mrrPaise = activeSubscriptions.reduce((sum, s) => sum + (s.plan?.priceMonthlyPaise ?? 0), 0);

  const orgsWithSubscription = subsByStatus.reduce((sum, s) => sum + s._count, 0);
  const noSubscriptionCount = Math.max(totalOrganizations - orgsWithSubscription, 0);

  const statusData = [
    ...subsByStatus.map((s) => ({ name: SUBSCRIPTION_STATUS_LABELS[s.status] ?? s.status, value: s._count })),
    ...(noSubscriptionCount > 0 ? [{ name: SUBSCRIPTION_STATUS_LABELS.NONE, value: noSubscriptionCount }] : []),
  ];

  const dailyMap = new Map<string, number>();
  for (const o of last30DaysOrgs) {
    const key = o.createdAt.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const signupsData = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000);
    const key = d.toISOString().slice(0, 10);
    return { date: key.slice(5), organizations: dailyMap.get(key) ?? 0 };
  });

  const stats = [
    {
      label: "Organizations",
      value: formatNumber(totalOrganizations),
      icon: Building2,
      color: "text-accent-blue bg-accent-blue/10",
    },
    {
      label: "Total users",
      value: formatNumber(totalUsers),
      icon: Users2,
      color: "text-accent-violet bg-accent-violet/10",
    },
    {
      label: "Total leads",
      value: formatNumber(totalLeads),
      icon: Users,
      color: "text-accent-teal bg-accent-teal/10",
    },
    {
      label: "Active subscriptions",
      value: `${formatNumber(activeSubscriptionsCount)} · ${formatPaise(mrrPaise)} MRR`,
      icon: CreditCard,
      color: "text-accent-amber bg-accent-amber/10",
    },
    {
      label: "WhatsApp sent",
      value: formatNumber(whatsappSent),
      icon: MessageCircle,
      color: "text-accent-rose bg-accent-rose/10",
    },
  ];

  return (
    <div>
      <PageHeader title="Platform overview" description="Cross-tenant stats across every organization on LeadFlow." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
              </div>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminCharts signupsData={signupsData} statusData={statusData} />
    </div>
  );
}
