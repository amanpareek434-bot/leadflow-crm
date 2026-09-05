"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Unplug } from "lucide-react";

/** Shared "Sync now" + "Disconnect" pair for any already-connected integration card. */
export function SyncDisconnectButtons({ type, label }: { type: string; label: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function onSync() {
    setSyncing(true);
    const res = await fetch(`/api/integrations/${type}/sync`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setSyncing(false);

    if (!res.ok) {
      toast({ title: "Couldn't queue sync", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    toast({ title: "Sync queued", description: `${label} sync will run in the background.`, variant: "success" });
    router.refresh();
  }

  async function onDisconnect() {
    if (!confirm(`Disconnect ${label}? You'll need to reconnect to resume syncing.`)) return;
    setDisconnecting(true);
    const res = await fetch(`/api/integrations/${type}/disconnect`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setDisconnecting(false);

    if (!res.ok) {
      toast({ title: "Couldn't disconnect", description: json.error ?? "Something went wrong.", variant: "destructive" });
      return;
    }
    toast({ title: "Disconnected", description: `${label} has been disconnected.` });
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={onSync} disabled={syncing}>
        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Queuing..." : "Sync now"}
      </Button>
      <Button size="sm" variant="ghost" onClick={onDisconnect} disabled={disconnecting}>
        <Unplug className="h-3.5 w-3.5" />
        {disconnecting ? "Disconnecting..." : "Disconnect"}
      </Button>
    </div>
  );
}
