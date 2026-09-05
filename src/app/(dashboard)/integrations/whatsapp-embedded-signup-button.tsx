"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Facebook } from "lucide-react";

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (cb: (res: { authResponse?: { code?: string } }) => void, opts: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
    __waSignupResult?: { phoneNumberId?: string; wabaId?: string };
  }
}

const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const CONFIG_ID = process.env.NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID;

/**
 * One-click "Connect with Facebook" WhatsApp onboarding (Meta Embedded
 * Signup) — the Wati/AiSensy-style flow. Renders nothing at all unless both
 * NEXT_PUBLIC_META_APP_ID and NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID are set,
 * which only happens once the platform owner has Meta's Tech Provider
 * approval for this — until then, the manual Phone Number ID/Token form
 * next to this button is the only path, and stays fully functional.
 */
export function WhatsAppEmbeddedSignupButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!APP_ID || !CONFIG_ID) return;
    if (window.FB) {
      setSdkReady(true);
      return;
    }

    window.fbAsyncInit = () => {
      window.FB?.init({ appId: APP_ID, autoLogAppEvents: true, xfbml: false, version: "v20.0" });
      setSdkReady(true);
    };

    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    // Embedded Signup posts phone_number_id/waba_id here as the flow finishes.
    function onMessage(event: MessageEvent) {
      if (event.origin !== "https://www.facebook.com") return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP" && data.event === "FINISH") {
          window.__waSignupResult = { phoneNumberId: data.data?.phone_number_id, wabaId: data.data?.waba_id };
        }
      } catch {
        // not our message — ignore
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!APP_ID || !CONFIG_ID) return null;

  function onConnect() {
    if (!window.FB) return;
    setConnecting(true);
    window.__waSignupResult = undefined;

    window.FB.login(
      async (response) => {
        const code = response.authResponse?.code;
        const result = window.__waSignupResult;

        if (!code || !result?.phoneNumberId || !result?.wabaId) {
          setConnecting(false);
          toast({
            title: "Connection cancelled",
            description: "The WhatsApp connect popup was closed before finishing.",
            variant: "destructive",
          });
          return;
        }

        const res = await fetch("/api/integrations/whatsapp/embedded-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, phoneNumberId: result.phoneNumberId, wabaId: result.wabaId }),
        });
        const json = await res.json().catch(() => ({}));
        setConnecting(false);

        if (!res.ok) {
          toast({ title: "Couldn't connect WhatsApp", description: json.error ?? "Something went wrong.", variant: "destructive" });
          return;
        }
        toast({ title: "WhatsApp connected", variant: "success" });
        router.refresh();
      },
      {
        config_id: CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { feature: "whatsapp_embedded_signup", sessionInfoVersion: "3" },
      }
    );
  }

  return (
    <Button onClick={onConnect} disabled={!sdkReady || connecting} className="gap-2">
      <Facebook className="h-4 w-4" />
      {connecting ? "Connecting..." : "Connect with Facebook"}
    </Button>
  );
}
