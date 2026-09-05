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

export function ApiKeyFormDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [fullKey, setFullKey] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/integrations/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      toast({ title: "Couldn't create key", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }

    setFullKey(json.key.fullKey);
    router.refresh();
  }

  function onClose(next: boolean) {
    setOpen(next);
    if (!next) {
      setName("");
      setFullKey(null);
    }
  }

  function copyKey() {
    if (!fullKey) return;
    navigator.clipboard?.writeText(fullKey).catch(() => {});
    toast({ title: "Copied to clipboard" });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Create API key
        </Button>
      </DialogTrigger>
      <DialogContent>
        {fullKey ? (
          <>
            <DialogHeader>
              <DialogTitle>API key created</DialogTitle>
              <DialogDescription className="text-destructive">
                Copy this key now — for security it will never be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3">
              <code className="flex-1 break-all text-xs">{fullKey}</code>
              <Button size="icon" variant="ghost" onClick={copyKey} type="button">
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
              <DialogTitle>Create an API key</DialogTitle>
              <DialogDescription>Use it to authenticate your own scripts/ERP against the public API.</DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  required
                  placeholder="Production ERP sync"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading || !name.trim()}>
                  {loading ? "Creating..." : "Create key"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
