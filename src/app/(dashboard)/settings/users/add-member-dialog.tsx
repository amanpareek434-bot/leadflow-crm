"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { UserPlus, Copy } from "lucide-react";

const ROLES = ["AGENT", "ADMIN", "OWNER"] as const;

export function AddMemberDialog({ canGrantOwner }: { canGrantOwner: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "AGENT" as (typeof ROLES)[number] });
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string } | null>(null);

  function reset() {
    setForm({ name: "", email: "", role: "AGENT" });
    setError(null);
    setCreated(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      return;
    }

    setCreated({ email: json.user.email, temporaryPassword: json.temporaryPassword });
    router.refresh();
  }

  function copyPassword() {
    if (!created) return;
    navigator.clipboard?.writeText(created.temporaryPassword).then(
      () => toast({ title: "Copied to clipboard", variant: "success" }),
      () => toast({ title: "Couldn't copy", variant: "destructive" })
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-2 h-4 w-4" /> Add team member
        </Button>
      </DialogTrigger>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Team member created</DialogTitle>
              <DialogDescription>
                Share this temporary password with {created.email} — it won't be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted p-3">
              <code className="text-sm font-medium">{created.temporaryPassword}</code>
              <Button type="button" variant="outline" size="sm" onClick={copyPassword}>
                <Copy className="mr-2 h-3.5 w-3.5" /> Copy
              </Button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add team member</DialogTitle>
              <DialogDescription>
                Creates an account with a generated temporary password (no email is sent — you'll share it directly).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="member-name">Name</Label>
                <Input
                  id="member-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-email">Email</Label>
                <Input
                  id="member-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">Role</Label>
                <Select
                  id="member-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as (typeof ROLES)[number] }))}
                >
                  {ROLES.filter((r) => r !== "OWNER" || canGrantOwner).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create account"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
