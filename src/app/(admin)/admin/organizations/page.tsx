import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { OrganizationsSearch, type OrgRow } from "./organizations-search";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
  const session = await getSession();
  if (!session || !session.user.isPlatformAdmin) redirect("/dashboard");

  const [totalCount, organizations] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { users: true, leads: true } },
      },
    }),
  ]);

  const rows: OrgRow[] = organizations.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    planName: org.subscription?.plan.name ?? "No plan",
    subscriptionStatus: org.subscription?.status ?? null,
    usersCount: org._count.users,
    leadsCount: org._count.leads,
    createdAt: org.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Organizations"
        description={`Showing ${formatNumber(organizations.length)} of ${formatNumber(totalCount)} total organization${totalCount === 1 ? "" : "s"}`}
      />

      <Card>
        <CardContent className="p-0">
          <OrganizationsSearch organizations={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
