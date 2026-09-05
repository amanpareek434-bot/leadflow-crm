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
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus } from "lucide-react";

type LeadOption = { id: string; name: string };

const EMPTY_FORM = { title: "", leadId: "", value: "" };

export function NewDealDialog({ leads }: { leads: LeadOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.leadId) {
      toast({ title: "Select a lead", variant: "destructive" });
      return;
    }
    setLoading(true);

    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        leadId: form.leadId,
        valuePaise: form.value ? Math.round(Number(form.value) * 100) : 0,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      toast({ title: "Couldn't add deal", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }

    toast({ title: "Deal added", variant: "success" });
    setForm(EMPTY_FORM);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Deal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new deal</DialogTitle>
          <DialogDescription>Link a deal to an existing lead.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Annual subscription"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leadId">Lead</Label>
            <Select
              id="leadId"
              required
              value={form.leadId}
              onChange={(e) => setForm((f) => ({ ...f, leadId: e.target.value }))}
            >
              <option value="">Select a lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Value (₹)</Label>
            <Input
              id="value"
              type="number"
              min={0}
              step="0.01"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              placeholder="50000"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DealActions({ dealId }: { dealId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function setWon(won: boolean) {
    setLoading(true);
    const res = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ won }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast({ title: "Couldn't update deal", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    toast({ title: won ? "Deal marked as won" : "Deal marked as lost", variant: won ? "success" : "default" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={loading} onClick={() => setWon(true)}>
        Mark Won
      </Button>
      <Button size="sm" variant="ghost" disabled={loading} onClick={() => setWon(false)}>
        Mark Lost
      </Button>
    </div>
  );
}
