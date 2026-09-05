"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Copy } from "lucide-react";

const ALLOWED_EVENTS = [
  "lead.created",
  "lead.status_changed",
  "deal.won",
  "deal.lost",
  "whatsapp.message_status",
] as const;

export function WebhookFormDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  function toggleEvent(event: string) {
    setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/integrations/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      toast({ title: "Couldn't add webhook", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }

    setCreatedSecret(json.subscription.secret);
    router.refresh();
  }

  function onClose(next: boolean) {
    setOpen(next);
    if (!next) {
      setUrl("");
      setEvents([]);
      setCreatedSecret(null);
    }
  }

  function copySecret() {
    if (!createdSecret) return;
    navigator.clipboard?.writeText(createdSecret).catch(() => {});
    toast({ title: "Copied to clipboard" });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add webhook
        </Button>
      </DialogTrigger>
      <DialogContent>
        {createdSecret ? (
          <>
            <DialogHeader>
              <DialogTitle>Webhook created</DialogTitle>
              <DialogDescription>
                Copy this signing secret now — it won't be shown again. Use it to verify the{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">X-CRM-Signature</code> header on deliveries.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3">
              <code className="flex-1 break-all text-xs">{createdSecret}</code>
              <Button size="icon" variant="ghost" onClick={copySecret} type="button">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => onClose(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add a webhook</DialogTitle>
              <DialogDescription>
                We'll POST a JSON body to this URL whenever a selected event happens, signed with{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">X-CRM-Signature</code> (HMAC-SHA256 of the raw
                body using a secret shown once after creation).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Endpoint URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  required
                  placeholder="https://your-erp.example.com/webhooks/crm"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Events</Label>
                <div className="space-y-1.5 rounded-md border border-border p-3">
                  {ALLOWED_EVENTS.map((event) => (
                    <label key={event} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={events.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <code className="text-xs">{event}</code>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading || !url || events.length === 0}>
                  {loading ? "Adding..." : "Add webhook"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
