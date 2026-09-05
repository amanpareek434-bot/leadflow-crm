"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export function GoogleAdsSettingsForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = useState(customerId);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const res = await fetch("/api/integrations/google-ads/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: value.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      toast({ title: "Couldn't save settings", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    toast({ title: "Google Ads settings saved", variant: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
      <div className="space-y-1">
        <Label htmlFor="gads-customer" className="text-xs">
          Customer ID
        </Label>
        <Input
          id="gads-customer"
          className="h-8 text-xs"
          placeholder="123-456-7890"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <Button size="sm" variant="outline" onClick={onSave} disabled={saving}>
        {saving ? "Saving..." : "Save settings"}
      </Button>
    </div>
  );
}
