"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export function GoogleSheetsSettingsForm({
  spreadsheetId,
  sheetName,
}: {
  spreadsheetId: string;
  sheetName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [sheetId, setSheetId] = useState(spreadsheetId);
  const [tab, setTab] = useState(sheetName || "Leads");
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);

  async function onSave() {
    setSaving(true);
    const res = await fetch("/api/integrations/google-sheets/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spreadsheetId: sheetId.trim(), sheetName: tab.trim() || "Leads" }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      toast({ title: "Couldn't save settings", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    toast({ title: "Google Sheets settings saved", variant: "success" });
    router.refresh();
  }

  async function onPush() {
    setPushing(true);
    const res = await fetch("/api/integrations/google-sheets/push", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setPushing(false);

    if (!res.ok) {
      toast({ title: "Couldn't push leads", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    toast({ title: "Leads pushed", description: `${json.pushed ?? 0} lead(s) sent to your Sheet.`, variant: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
      <div className="space-y-1">
        <Label htmlFor="sheets-id" className="text-xs">
          Spreadsheet ID
        </Label>
        <Input
          id="sheets-id"
          className="h-8 text-xs"
          placeholder="1AbCDefGhIJkLmNoPQRstuVWxyZ"
          value={sheetId}
          onChange={(e) => setSheetId(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sheets-tab" className="text-xs">
          Sheet/tab name
        </Label>
        <Input id="sheets-tab" className="h-8 text-xs" value={tab} onChange={(e) => setTab(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onPush} disabled={pushing || !sheetId.trim()}>
          {pushing ? "Pushing..." : "Push leads now"}
        </Button>
      </div>
    </div>
  );
}
