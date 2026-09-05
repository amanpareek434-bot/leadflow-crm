"use client";

import { useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { LEAD_STATUS_LABELS } from "@/lib/utils";
import type { LeadStatus } from "@prisma/client";
import { Check } from "lucide-react";

type Template = { id: string; name: string; language: string };

type Row = {
  triggerStatus: LeadStatus;
  templateId: string | null;
  delayMinutes: number;
  isActive: boolean;
};

export function AutomationRulesTable({
  rows,
  templates,
  readOnly,
}: {
  rows: Row[];
  templates: Template[];
  readOnly?: boolean;
}) {
  const { toast } = useToast();
  const [state, setState] = useState<Record<LeadStatus, Row>>(
    () => Object.fromEntries(rows.map((r) => [r.triggerStatus, r])) as Record<LeadStatus, Row>
  );
  const [saving, setSaving] = useState<LeadStatus | null>(null);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  function patch(status: LeadStatus, patch: Partial<Row>) {
    setState((s) => ({ ...s, [status]: { ...s[status], ...patch } }));
    setDirty((d) => ({ ...d, [status]: true }));
  }

  async function onSave(status: LeadStatus) {
    setSaving(status);
    const row = state[status];
    try {
      const res = await fetch("/api/whatsapp/automations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerStatus: status,
          templateId: row.templateId || null,
          delayMinutes: row.delayMinutes,
          isActive: row.isActive,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Couldn't save", description: json.error ?? "Something went wrong.", variant: "destructive" });
        return;
      }
      toast({
        title: "Saved",
        description: row.templateId
          ? `${LEAD_STATUS_LABELS[status]} leads will now trigger this template.`
          : `Automation for ${LEAD_STATUS_LABELS[status]} leads cleared.`,
      });
      setDirty((d) => ({ ...d, [status]: false }));
    } catch {
      toast({ title: "Couldn't save", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When status becomes</TableHead>
          <TableHead>Send template</TableHead>
          <TableHead>Delay (min)</TableHead>
          <TableHead>Active</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const row = state[r.triggerStatus];
          return (
            <TableRow key={r.triggerStatus}>
              <TableCell className="font-medium">{LEAD_STATUS_LABELS[r.triggerStatus]}</TableCell>
              <TableCell className="min-w-[220px]">
                <Select
                  disabled={readOnly}
                  value={row.templateId ?? ""}
                  onChange={(e) => patch(r.triggerStatus, { templateId: e.target.value || null })}
                >
                  <option value="">— none —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.language})
                    </option>
                  ))}
                </Select>
              </TableCell>
              <TableCell className="w-28">
                <Input
                  type="number"
                  min={0}
                  disabled={readOnly}
                  value={row.delayMinutes}
                  onChange={(e) => patch(r.triggerStatus, { delayMinutes: Math.max(0, Number(e.target.value) || 0) })}
                />
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => patch(r.triggerStatus, { isActive: !row.isActive })}
                  className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${
                    row.isActive ? "justify-end bg-primary" : "justify-start bg-muted"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  aria-pressed={row.isActive}
                  aria-label={row.isActive ? "Active" : "Inactive"}
                >
                  <span className="h-5 w-5 rounded-full bg-background shadow" />
                </button>
              </TableCell>
              <TableCell>
                {!readOnly && (
                  <Button
                    size="sm"
                    variant={dirty[r.triggerStatus] ? "default" : "outline"}
                    onClick={() => onSave(r.triggerStatus)}
                    disabled={saving === r.triggerStatus}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {saving === r.triggerStatus ? "Saving..." : "Save"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
