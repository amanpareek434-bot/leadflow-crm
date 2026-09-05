"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Plus } from "lucide-react";

export function SyncTemplatesButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function onSync() {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/templates/sync", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Couldn't sync templates",
          description: json.error ?? "Connect WhatsApp in Integrations first.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Templates synced", description: `${json.synced ?? 0} template(s) pulled from WhatsApp.` });
      router.refresh();
    } catch {
      toast({ title: "Couldn't sync templates", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={onSync} disabled={loading}>
      <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      {loading ? "Syncing..." : "Sync from WhatsApp"}
    </Button>
  );
}

export function AddTemplateDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    language: "en_US",
    category: "MARKETING",
    bodyText: "",
    status: "APPROVED",
  });

  function update<K extends keyof typeof form>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Couldn't add template", description: json.error ?? "Invalid input", variant: "destructive" });
        return;
      }
      toast({ title: "Template added", description: `"${form.name}" is ready to use in automations.` });
      setOpen(false);
      setForm({ name: "", language: "en_US", category: "MARKETING", bodyText: "", status: "APPROVED" });
      router.refresh();
    } catch {
      toast({ title: "Couldn't add template", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add template manually
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a WhatsApp template</DialogTitle>
          <DialogDescription>
            Use this for a template that's already approved in WhatsApp Business Manager.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template name</Label>
            <Input id="name" required value={form.name} onChange={update("name")} placeholder="lead_lost_followup" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input id="language" required value={form.language} onChange={update("language")} placeholder="en_US" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select id="category" value={form.category} onChange={update("category")}>
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utility</option>
                <option value="AUTHENTICATION">Authentication</option>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bodyText">Body text</Label>
            <Textarea
              id="bodyText"
              required
              rows={4}
              value={form.bodyText}
              onChange={update("bodyText")}
              placeholder="Hi {{1}}, sorry to see you go. If anything changes, we're here!"
            />
            <p className="text-xs text-muted-foreground">
              Use <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code>, etc. as variable placeholders — these must match
              the approved template exactly.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={form.status} onChange={update("status")}>
              <option value="APPROVED">Approved (already live on WhatsApp)</option>
              <option value="PENDING">Pending review</option>
              <option value="REJECTED">Rejected</option>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
