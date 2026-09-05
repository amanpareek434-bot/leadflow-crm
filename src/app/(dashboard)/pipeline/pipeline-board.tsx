"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, formatPaise, cn, initials } from "@/lib/utils";

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
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByColumn(direction: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: direction * 296, behavior: "smooth" });
  }

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
    <div className="relative">
      <div className="mb-3 flex justify-end gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scrollByColumn(-1)} aria-label="Scroll left">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scrollByColumn(1)} aria-label="Scroll right">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div ref={scrollerRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {STATUSES.map((status) => {
        const leads = board[status] ?? [];
        const colorClass = LEAD_STATUS_COLORS[status];
        return (
          <div key={status} className="kanban-column snap-start">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold", colorClass)}>
                {LEAD_STATUS_LABELS[status]}
              </span>
              <span className="text-xs font-medium text-muted-foreground">{leads.length}</span>
            </div>

            <div className="flex flex-1 flex-col gap-2">
              {leads.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  No leads here
                </p>
              ) : (
                leads.map((lead) => (
                  <div
                    key={lead.id}
                    className={cn(
                      "rounded-lg border border-border bg-card p-3 shadow-sm transition-opacity",
                      movingId === lead.id && "opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(lead.name) || "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/leads/${lead.id}`} className="block truncate text-sm font-medium hover:underline">
                          {lead.name}
                        </Link>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" /> {lead.phone ?? "No phone"}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-semibold">{formatPaise(lead.value)}</p>
                    <Select
                      className="mt-2 h-8 text-xs"
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
    </div>
  );
}
