import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageIntegrations } from "@/lib/rbac";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { WebhookFormDialog } from "./webhook-form";
import { DeleteWebhookButton } from "./delete-webhook-button";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;
  const canManage = canManageIntegrations(session!.user.role);

  const subscriptions = await prisma.webhookSubscription.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { deliveries: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Get notified in real time when leads, deals, or WhatsApp statuses change."
        actions={canManage ? <WebhookFormDialog /> : undefined}
      />

      <p className="mb-4 text-xs text-muted-foreground">
        Every delivery is a POST of a JSON body, signed with header{" "}
        <code className="rounded bg-muted px-1 py-0.5">X-CRM-Signature</code> — HMAC-SHA256 of the raw JSON body
        using the secret shown once when you create the webhook.
      </p>

      <Card>
        <CardContent className="p-0">
          {subscriptions.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No webhooks yet. Click "Add webhook" to get notified when events happen.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last delivery</TableHead>
                  <TableHead>Created</TableHead>
                  {canManage && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => {
                  const lastDelivery = sub.deliveries[0];
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="max-w-[240px] truncate font-medium">{sub.url}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {sub.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-[10px]">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.isActive ? "success" : "secondary"}>{sub.isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lastDelivery ? (
                          <>
                            <Badge
                              variant={
                                lastDelivery.status === "SUCCESS"
                                  ? "success"
                                  : lastDelivery.status === "FAILED"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="mr-1"
                            >
                              {lastDelivery.status}
                            </Badge>
                            {lastDelivery.responseCode ?? "—"}
                          </>
                        ) : (
                          "No deliveries yet"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(sub.createdAt)}</TableCell>
                      {canManage && (
                        <TableCell>
                          <DeleteWebhookButton id={sub.id} />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
