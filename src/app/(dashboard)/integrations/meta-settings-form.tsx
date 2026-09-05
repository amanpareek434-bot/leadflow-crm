"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export function MetaSettingsForm({ adAccountId, formIds }: { adAccountId: string; formIds: string[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [account, setAccount] = useState(adAccountId);
  const [forms, setForms] = useState(formIds.join(", "));
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const res = await fetch("/api/integrations/meta-ads/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adAccountId: account.trim(),
        formIds: forms
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      toast({ title: "Couldn't save settings", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    toast({ title: "Meta Ads settings saved", variant: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
      <div className="space-y-1">
        <Label htmlFor="meta-account" className="text-xs">
          Ad Account ID
        </Label>
        <Input
          id="meta-account"
          className="h-8 text-xs"
          placeholder="act_1234567890"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="meta-forms" className="text-xs">
          Lead Ads form IDs (comma-separated)
        </Label>
        <Input
          id="meta-forms"
          className="h-8 text-xs"
          placeholder="1234567890, 9876543210"
          value={forms}
          onChange={(e) => setForms(e.target.value)}
        />
      </div>
      <Button size="sm" variant="outline" onClick={onSave} disabled={saving}>
        {saving ? "Saving..." : "Save settings"}
      </Button>
    </div>
  );
}
