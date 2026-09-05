"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, formatPaise, cn } from "@/lib/utils";

type BoardLead = {
  id: string;
  name: string;
  phone: string | null;
  value: number | null;
  status: string;
};

const STATUSES = Object.keys(LEAD_STATUS_LABELS);

export function PipelineBoard({ leadsByStatus }: { leadsByStatus: Record<string, BoardLead[]> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [movingId, setMovingId] = useState<string | null>(null);

  async function moveTo(leadId: string, newStatus: string) {
    setMovingId(leadId);
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json().catch(() => ({}));
    setMovingId(null);
    if (!res.ok) {
      toast({ title: "Couldn't move lead", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    toast({ title: "Lead moved", description: `Now in ${LEAD_STATUS_LABELS[newStatus]}.`, variant: "success" });
    router.refresh();
  }

  return (
    <div className="grid grid-flow-col auto-cols-[280px] gap-4 overflow-x-auto pb-4">
      {STATUSES.map((status) => {
        const leads = leadsByStatus[status] ?? [];
        return (
          <div key={status} className="flex flex-col">
            <div className={cn("mb-3 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold", LEAD_STATUS_COLORS[status])}>
              <span>{LEAD_STATUS_LABELS[status]}</span>
              <span className="text-xs font-normal opacity-70">{leads.length}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {leads.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">No leads</p>
              ) : (
                leads.map((lead) => (
                  <Card key={lead.id} className="p-3">
                    <Link href={`/leads/${lead.id}`} className="text-sm font-medium hover:underline">
                      {lead.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{lead.phone ?? "No phone"}</p>
                    <p className="mt-0.5 text-xs font-medium">{formatPaise(lead.value)}</p>
                    <Select
                      className="mt-2 h-8 text-xs"
                      value={status}
                      disabled={movingId === lead.id}
                      onChange={(e) => moveTo(lead.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          Move to {LEAD_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </Select>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
