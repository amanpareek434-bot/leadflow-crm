import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling } from "@/lib/rbac";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsSubnav } from "@/components/settings/settings-subnav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPaise, formatDate } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { UpgradeButton } from "./upgrade-button";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, "success" | "warning" | "destructive"> = {
  TRIALING: "warning",
  ACTIVE: "success",
  PAST_DUE: "destructive",
  CANCELLED: "destructive",
  EXPIRED: "destructive",
};

export default async function BillingSettingsPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;
  const canManage = canManageBilling(session!.user.role);

  const [subscription, plans] = await Promise.all([
    prisma.subscription.findUnique({ where: { organizationId }, include: { plan: true } }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthlyPaise: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Billing" description="Manage your subscription plan and payment." />
      <SettingsSubnav />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Current subscription</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-2xl font-bold">{subscription?.plan.name ?? "No active plan"}</p>
            {subscription && (
              <p className="mt-1 text-sm text-muted-foreground">
                {formatPaise(subscription.plan.priceMonthlyPaise)}/mo
              </p>
            )}
          </div>
          {subscription && <Badge variant={STATUS_BADGE[subscription.status] ?? "outline"}>{subscription.status}</Badge>}
          <div className="ml-auto space-y-1 text-sm text-muted-foreground">
            {subscription?.trialEndsAt && <p>Trial ends: {formatDate(subscription.trialEndsAt)}</p>}
            {subscription?.currentPeriodEnd && <p>Renews: {formatDate(subscription.currentPeriodEnd)}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = subscription?.planId === plan.id;
          const configured = Boolean(plan.razorpayPlanId);

          return (
            <Card key={plan.id} className={isCurrent ? "border-primary ring-1 ring-primary" : ""}>
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-2xl font-bold">
                  {formatPaise(plan.priceMonthlyPaise)}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {(plan.features as string[]).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              {canManage && (
                <CardFooter>
                  {isCurrent ? (
                    <Button className="w-full" variant="outline" disabled>
                      Current plan
                    </Button>
                  ) : configured ? (
                    <UpgradeButton planId={plan.id} planName={plan.name} />
                  ) : (
                    <Button className="w-full" variant="outline" disabled title="Billing not configured for this plan yet">
                      Billing not configured for this plan yet
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
