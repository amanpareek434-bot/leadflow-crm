import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageIntegrations } from "@/lib/rbac";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { ApiKeyFormDialog } from "./api-key-form";
import { RevokeKeyButton } from "./revoke-key-button";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;
  const canManage = canManageIntegrations(session!.user.role);

  const keys = await prisma.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, revokedAt: true, createdAt: true },
  });

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Authenticate your own ERP/scripts against the public REST API."
        actions={canManage ? <ApiKeyFormDialog /> : undefined}
      />

      <Card className="mb-4">
        <CardContent className="space-y-2 p-4">
          <p className="text-sm font-medium">Usage example</p>
          <pre className="overflow-x-auto rounded-md bg-muted/60 p-3 text-xs">
            <code>{`curl -H "Authorization: Bearer crm_live_xxx" \\
  https://<your-domain>/api/v1/leads`}</code>
          </pre>
          <p className="text-xs text-muted-foreground">
            Supports <code className="rounded bg-muted px-1 py-0.5">GET</code> /api/v1/leads (filter with{" "}
            <code className="rounded bg-muted px-1 py-0.5">?status=</code> and{" "}
            <code className="rounded bg-muted px-1 py-0.5">?since=</code>), <code className="rounded bg-muted px-1 py-0.5">POST</code> /api/v1/leads, and{" "}
            <code className="rounded bg-muted px-1 py-0.5">GET</code>/<code className="rounded bg-muted px-1 py-0.5">PATCH</code>{" "}
            /api/v1/leads/[id].
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {keys.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No API keys yet. Click "Create API key" to generate one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Created</TableHead>
                  {canManage && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground">{key.keyPrefix}…</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.revokedAt ? "secondary" : "success"}>
                        {key.revokedAt ? "Revoked" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.lastUsedAt ? formatDate(key.lastUsedAt) : "Never"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(key.createdAt)}</TableCell>
                    {canManage && (
                      <TableCell>{!key.revokedAt && <RevokeKeyButton id={key.id} />}</TableCell>
                    )}
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
