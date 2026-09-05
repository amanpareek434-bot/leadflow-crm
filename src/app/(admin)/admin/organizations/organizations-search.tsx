"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/utils";

export type OrgRow = {
  id: string;
  name: string;
  slug: string;
  planName: string;
  subscriptionStatus: string | null;
  usersCount: number;
  leadsCount: number;
  createdAt: string;
};

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

export function OrganizationsSearch({ organizations }: { organizations: OrgRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter(
      (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q)
    );
  }, [organizations, query]);

  return (
    <div>
      <div className="border-b border-border p-4">
        <Input
          className="max-w-sm"
          placeholder="Search by name or slug…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">No organizations match your search.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((org) => (
              <TableRow key={org.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/admin/organizations/${org.id}`} className="font-medium hover:underline">
                    {org.name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{org.slug}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{org.planName}</TableCell>
                <TableCell>
                  <Badge variant={org.subscriptionStatus ? STATUS_VARIANT[org.subscriptionStatus] : "secondary"}>
                    {org.subscriptionStatus ? STATUS_LABEL[org.subscriptionStatus] ?? org.subscriptionStatus : "None"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatNumber(org.usersCount)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatNumber(org.leadsCount)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(org.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
