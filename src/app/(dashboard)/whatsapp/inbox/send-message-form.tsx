"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Send } from "lucide-react";

type Lead = { id: string; name: string; phone?: string | null };

export function SendMessageForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadId, setLeadId] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [leadsLoading, setLeadsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/leads?take=200");
        const data = await res.json().catch(() => ({}));
        const list: Lead[] = Array.isArray(data) ? data : data.leads ?? [];
        setLeads(list.filter((l) => !!l.phone));
      } catch {
        setLeads([]);
      } finally {
        setLeadsLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadId || !bodyText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, bodyText }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Couldn't send message", description: json.error ?? "Something went wrong.", variant: "destructive" });
        return;
      }
      toast({ title: "Message queued", description: "It will appear below once sent." });
      setBodyText("");
      router.refresh();
    } catch {
      toast({ title: "Couldn't send message", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Send a message</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Lead</label>
            <Select value={leadId} onChange={(e) => setLeadId(e.target.value)} required disabled={leadsLoading}>
              <option value="">{leadsLoading ? "Loading leads..." : "Select a lead"}</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.phone ? `(${l.phone})` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-[2] space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Type a message..."
              rows={1}
              className="min-h-[40px]"
              required
            />
          </div>
          <Button type="submit" disabled={loading || !leadId || !bodyText.trim()}>
            <Send className="h-4 w-4" />
            {loading ? "Sending..." : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
