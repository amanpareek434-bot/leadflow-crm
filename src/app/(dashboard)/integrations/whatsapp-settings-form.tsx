"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

// Each organization connects their OWN WhatsApp Business number here — these
// three values come from that org's Meta for Developers app (WhatsApp > API
// Setup). Saving upserts the org's WHATSAPP Integration row (encrypted) and
// marks it CONNECTED, same pattern as the other integrations on this page.
export function WhatsAppSettingsForm({
  phoneNumberId,
  businessAccountId,
  hasAccessToken,
}: {
  phoneNumberId: string;
  businessAccountId: string;
  hasAccessToken: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({ phoneNumberId, businessAccountId, accessToken: "" });
  const [saving, setSaving] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSave() {
    setSaving(true);
    const res = await fetch("/api/integrations/whatsapp/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumberId: form.phoneNumberId.trim(),
        businessAccountId: form.businessAccountId.trim(),
        // Only send a new access token if the user actually typed one — an
        // empty string means "keep the one already stored".
        accessToken: form.accessToken.trim() || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      toast({ title: "Couldn't save WhatsApp settings", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    toast({ title: "WhatsApp connected", variant: "success" });
    setForm((f) => ({ ...f, accessToken: "" }));
    router.refresh();
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
      <div className="space-y-1">
        <Label htmlFor="wa-phone-id" className="text-xs">
          Phone Number ID
        </Label>
        <Input
          id="wa-phone-id"
          className="h-8 text-xs"
          placeholder="e.g. 109876543210123"
          value={form.phoneNumberId}
          onChange={update("phoneNumberId")}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="wa-waba-id" className="text-xs">
          WhatsApp Business Account ID
        </Label>
        <Input
          id="wa-waba-id"
          className="h-8 text-xs"
          placeholder="e.g. 123456789012345"
          value={form.businessAccountId}
          onChange={update("businessAccountId")}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="wa-token" className="text-xs">
          Access Token {hasAccessToken && <span className="text-muted-foreground">(already saved — leave blank to keep it)</span>}
        </Label>
        <Input
          id="wa-token"
          type="password"
          className="h-8 text-xs"
          placeholder={hasAccessToken ? "••••••••••••" : "Paste your permanent access token"}
          value={form.accessToken}
          onChange={update("accessToken")}
        />
      </div>
      <Button size="sm" variant="outline" onClick={onSave} disabled={saving}>
        {saving ? "Saving..." : "Save & connect"}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        From your own Meta for Developers app → WhatsApp → API Setup. See DEPLOY.md for exact steps.
      </p>
    </div>
  );
}
