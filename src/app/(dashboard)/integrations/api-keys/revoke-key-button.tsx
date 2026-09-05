"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Ban } from "lucide-react";

export function RevokeKeyButton({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function onRevoke() {
    if (!confirm("Revoke this API key? Anything using it will stop working immediately.")) return;
    setLoading(true);
    const res = await fetch(`/api/integrations/api-keys/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      toast({ title: "Couldn't revoke key", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    toast({ title: "API key revoked" });
    router.refresh();
  }

  return (
    <Button size="sm" variant="ghost" onClick={onRevoke} disabled={loading}>
      <Ban className="h-3.5 w-3.5" />
      {loading ? "Revoking..." : "Revoke"}
    </Button>
  );
}
