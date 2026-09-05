"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Trash2 } from "lucide-react";

export function DeleteWebhookButton({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this webhook? Delivery history will be removed too.")) return;
    setLoading(true);
    const res = await fetch(`/api/integrations/webhooks/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      toast({ title: "Couldn't delete webhook", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    toast({ title: "Webhook deleted" });
    router.refresh();
  }

  return (
    <Button size="sm" variant="ghost" onClick={onDelete} disabled={loading}>
      <Trash2 className="h-3.5 w-3.5" />
      {loading ? "Deleting..." : "Delete"}
    </Button>
  );
}
