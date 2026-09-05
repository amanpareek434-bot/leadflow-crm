"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "AGENT";
  isActive: boolean;
  createdAt: string | Date;
};

const ROLE_BADGE: Record<Member["role"], "default" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "secondary",
  AGENT: "outline",
};

export function UsersTable({
  users,
  canManage,
  currentUserRole,
}: {
  users: Member[];
  canManage: boolean;
  currentUserRole: "OWNER" | "ADMIN" | "AGENT";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function patchUser(id: string, data: Record<string, unknown>) {
    setPendingId(id);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    setPendingId(null);

    if (!res.ok) {
      toast({ title: "Update failed", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    toast({ title: "Team member updated", variant: "success" });
    router.refresh();
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
          {canManage && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => {
          const disabled = pendingId === u.id || (u.role === "OWNER" && currentUserRole !== "OWNER");
          return (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell>
                {canManage ? (
                  <Select
                    className="h-8 w-28 text-xs"
                    value={u.role}
                    disabled={disabled}
                    onChange={(e) => patchUser(u.id, { role: e.target.value })}
                  >
                    {(["OWNER", "ADMIN", "AGENT"] as const)
                      .filter((r) => r !== "OWNER" || currentUserRole === "OWNER" || u.role === "OWNER")
                      .map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                  </Select>
                ) : (
                  <Badge variant={ROLE_BADGE[u.role]}>{u.role}</Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={u.isActive ? "success" : "outline"}>{u.isActive ? "Active" : "Inactive"}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => patchUser(u.id, { isActive: !u.isActive })}
                  >
                    {u.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
