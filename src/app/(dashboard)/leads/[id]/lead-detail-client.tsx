"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, formatDate } from "@/lib/utils";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  value: number | null;
  assignedToId: string | null;
};

type Activity = {
  id: string;
  type: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string } | null;
};

type OrgUser = { id: string; name: string };

export function LeadDetailClient({
  lead,
  activities,
  orgUsers,
}: {
  lead: Lead;
  activities: Activity[];
  orgUsers: OrgUser[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: lead.name,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    company: lead.company ?? "",
    value: lead.value ? String(lead.value / 100) : "",
    assignedToId: lead.assignedToId ?? "",
  });
  const [status, setStatus] = useState(lead.status);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [note, setNote] = useState("");
  const [postingNote, setPostingNote] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function patchLead(payload: Record<string, unknown>) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ title: "Couldn't update lead", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return null;
    }
    return json.lead;
  }

  async function onSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const updated = await patchLead({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      company: form.company || null,
      value: form.value ? Math.round(Number(form.value) * 100) : null,
      assignedToId: form.assignedToId || null,
    });
    setSaving(false);
    if (updated) {
      toast({ title: "Lead updated", variant: "success" });
      router.refresh();
    }
  }

  async function onStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    const prevStatus = status;
    setStatus(newStatus);
    setStatusSaving(true);
    const updated = await patchLead({ status: newStatus });
    setStatusSaving(false);
    if (updated) {
      toast({ title: "Status updated", description: `Lead is now ${LEAD_STATUS_LABELS[newStatus]}.`, variant: "success" });
      router.refresh();
    } else {
      setStatus(prevStatus);
    }
  }

  async function onAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setPostingNote(true);
    const res = await fetch(`/api/leads/${lead.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: note, type: "NOTE" }),
    });
    const json = await res.json().catch(() => ({}));
    setPostingNote(false);
    if (!res.ok) {
      toast({ title: "Couldn't add note", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    setNote("");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSaveDetails} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={form.name} onChange={update("name")} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={form.company} onChange={update("company")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={update("email")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={update("phone")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Est. value (₹)</Label>
                  <Input id="value" type="number" min={0} step="0.01" value={form.value} onChange={update("value")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedToId">Assigned to</Label>
                  <Select
                    id="assignedToId"
                    value={form.assignedToId}
                    onChange={(e) => setForm((f) => ({ ...f, assignedToId: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {orgUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onAddNote} className="space-y-2">
              <Textarea
                placeholder="Add a note about this lead..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={postingNote || !note.trim()}>
                {postingNote ? "Adding..." : "Add note"}
              </Button>
            </form>

            <div className="space-y-3 border-t border-border pt-4">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{a.type}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm">{a.body}</p>
                    {a.user && <p className="mt-1 text-xs text-muted-foreground">by {a.user.name}</p>}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge className={LEAD_STATUS_COLORS[status]}>{LEAD_STATUS_LABELS[status]}</Badge>
            <Select value={status} onChange={onStatusChange} disabled={statusSaving}>
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
