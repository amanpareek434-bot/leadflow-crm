import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsSubnav } from "@/components/settings/settings-subnav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { OrganizationForm } from "./organization-form";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, "success" | "warning" | "destructive"> = {
  TRIALING: "warning",
  ACTIVE: "success",
  PAST_DUE: "destructive",
  CANCELLED: "destructive",
  EXPIRED: "destructive",
};

export default async function OrganizationSettingsPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const [organization, subscription] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.subscription.findUnique({ where: { organizationId }, include: { plan: true } }),
  ]);

  if (!organization) return null;

  return (
    <div>
      <PageHeader title="Organization" description="Manage your organization's profile and preferences." />
      <SettingsSubnav />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OrganizationForm name={organization.name} timezone={organization.timezone} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
              <CardDescription>Read-only information about your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-medium">{organization.slug}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{formatDate(organization.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan</CardTitle>
              <CardDescription>Your current subscription.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{subscription?.plan.name ?? "No plan"}</span>
                {subscription && (
                  <Badge variant={STATUS_BADGE[subscription.status] ?? "outline"}>{subscription.status}</Badge>
                )}
              </div>
              <Link href="/settings/billing">
                <Button variant="outline" size="sm" className="w-full">
                  Manage billing
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
