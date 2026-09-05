import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDate, formatNumber, formatPaise } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "warning" | "success" | "destructive" | "secondary"> = {
  TRIALING: "warning",
  ACTIVE: "success",
  PAST_DUE: "destructive",
  CANCELLED: "destructive",
  EXPIRED: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  TRIALING: "Trialing",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export default async function AdminOrganizationDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !session.user.isPlatformAdmin) redirect("/dashboard");

  const organization = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      subscription: { include: { plan: true } },
      users: { orderBy: { createdAt: "desc" } },
      integrations: { where: { status: "CONNECTED" } },
    },
  });

  if (!organization) {
    return (
      <div>
        <PageHeader title="Organization not found" description="This organization does not exist or has been deleted." />
      </div>
    );
  }

  const [leadsCount, dealsCount, whatsappCount] = await Promise.all([
    prisma.lead.count({ where: { organizationId: organization.id } }),
    prisma.deal.count({ where: { organizationId: organization.id } }),
    prisma.whatsAppMessageLog.count({ where: { organizationId: organization.id, direction: "OUTBOUND" } }),
  ]);

  const stats = [
    { label: "Leads", value: formatNumber(leadsCount) },
    { label: "Deals", value: formatNumber(dealsCount) },
    { label: "WhatsApp sent", value: formatNumber(whatsappCount) },
    {
      label: "Connected integrations",
      value: organization.integrations.length > 0 ? organization.integrations.map((i) => i.type).join(", ") : "None",
    },
  ];

  return (
    <div>
      <PageHeader
        title={organization.name}
        description={`/${organization.slug} · ${organization.timezone} · created ${formatDate(organization.createdAt)}`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 truncate text-lg font-bold" title={s.value}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
            <CardDescription>Billing plan and status for this organization.</CardDescription>
          </CardHeader>
          <CardContent>
            {organization.subscription ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Plan</p>
                  <p className="mt-1 font-medium">{organization.subscription.plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPaise(organization.subscription.plan.priceMonthlyPaise)} / mo
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                  <Badge className="mt-1" variant={STATUS_VARIANT[organization.subscription.status]}>
                    {STATUS_LABEL[organization.subscription.status] ?? organization.subscription.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Current period end</p>
                  <p className="mt-1 font-medium">{formatDate(organization.subscription.currentPeriodEnd)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Trial ends</p>
                  <p className="mt-1 font-medium">{formatDate(organization.subscription.trialEndsAt)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This organization has no subscription.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users ({organization.users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {organization.users.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">This organization has no users.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organization.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.role}</TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "success" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
