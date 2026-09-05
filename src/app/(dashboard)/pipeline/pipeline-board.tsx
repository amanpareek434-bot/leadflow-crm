"use client";

import { useState } from "react";
import Link from "next/link";
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
  const { toast } = useToast();
  // Local, optimistic copy of the board — moving a card updates this
  // instantly instead of waiting on a full server round-trip + page refresh,
  // which is what made every move feel slow before.
  const [board, setBoard] = useState(leadsByStatus);
  const [movingId, setMovingId] = useState<string | null>(null);

  async function moveTo(lead: BoardLead, newStatus: string) {
    if (newStatus === lead.status) return;
    const fromStatus = lead.status;

    // Optimistic move: update the UI immediately.
    setMovingId(lead.id);
    setBoard((prev) => ({
      ...prev,
      [fromStatus]: (prev[fromStatus] ?? []).filter((l) => l.id !== lead.id),
      [newStatus]: [{ ...lead, status: newStatus }, ...(prev[newStatus] ?? [])],
    }));

    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setMovingId(null);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      // Roll back on failure.
      setBoard((prev) => ({
        ...prev,
        [newStatus]: (prev[newStatus] ?? []).filter((l) => l.id !== lead.id),
        [fromStatus]: [{ ...lead, status: fromStatus }, ...(prev[fromStatus] ?? [])],
      }));
      toast({ title: "Couldn't move lead", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    toast({ title: `Moved to ${LEAD_STATUS_LABELS[newStatus]}`, variant: "success" });
  }

  return (
    // Fixed grid, no horizontal scroll: wraps to more rows on narrower
    // screens instead of ever needing a sideways drag to reach a column.
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {STATUSES.map((status) => {
        const leads = board[status] ?? [];
        const colorClass = LEAD_STATUS_COLORS[status];
        return (
          <div key={status} className="flex flex-col gap-3 rounded-lg bg-muted p-2.5">
            <div className="flex items-center justify-between px-0.5">
              <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold", colorClass)}>
                {LEAD_STATUS_LABELS[status]}
              </span>
              <span className="text-xs font-medium text-muted-foreground">{leads.length}</span>
            </div>

            <div className="flex flex-1 flex-col gap-2">
              {leads.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-2 py-5 text-center text-[11px] text-muted-foreground">
                  No leads
                </p>
              ) : (
                leads.map((lead) => (
                  <div
                    key={lead.id}
                    className={cn(
                      "rounded-md border border-border bg-card p-2.5 shadow-sm transition-opacity",
                      movingId === lead.id && "opacity-60"
                    )}
                  >
                    <Link href={`/leads/${lead.id}`} className="block truncate text-sm font-medium hover:underline">
                      {lead.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{lead.phone ?? "No phone"}</p>
                    <p className="mt-1 text-xs font-semibold">{formatPaise(lead.value)}</p>
                    <Select
                      className="mt-2 h-7 px-2 text-[11px]"
                      value={status}
                      disabled={movingId === lead.id}
                      onChange={(e) => moveTo(lead, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          Move to {LEAD_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
