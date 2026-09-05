import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/rbac";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsSubnav } from "@/components/settings/settings-subnav";
import { Card, CardContent } from "@/components/ui/card";
import { AddMemberDialog } from "./add-member-dialog";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;
  const role = session!.user.role;
  const canManage = canManageUsers(role);

  const users = await prisma.user.findMany({
    where: { organizationId },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Team members"
        description="Manage who has access to your organization."
        actions={canManage ? <AddMemberDialog canGrantOwner={role === "OWNER"} /> : undefined}
      />
      <SettingsSubnav />

      {!canManage && (
        <Card className="mb-4">
          <CardContent className="p-4 text-sm text-muted-foreground">
            You don't have permission to manage team members. Contact an admin or owner to make changes.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <UsersTable users={users} canManage={canManage} currentUserRole={role} />
        </CardContent>
      </Card>
    </div>
  );
}
