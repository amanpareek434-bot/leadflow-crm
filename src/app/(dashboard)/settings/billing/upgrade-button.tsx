"use client";

// Client-side Razorpay Checkout flow for switching plans.
//
// Requires these env vars to be configured (see .env.example):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, NEXT_PUBLIC_RAZORPAY_KEY_ID
// and each Plan.razorpayPlanId must be set to a Plan created in the Razorpay
// dashboard. If a plan has no razorpayPlanId, its button is disabled below.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${CHECKOUT_SRC}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script"));
    document.body.appendChild(script);
  });
}

export function UpgradeButton({ planId, planName }: { planId: string; planName: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong starting checkout.");

      const { subscriptionId, razorpayKeyId, planName: confirmedPlanName } = json;

      await loadRazorpayScript();

      const rzp = new (window as any).Razorpay({
        key: razorpayKeyId,
        subscription_id: subscriptionId,
        name: "LeadFlow CRM",
        description: confirmedPlanName ?? planName,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            if (!verifyRes.ok) {
              const verifyJson = await verifyRes.json().catch(() => ({}));
              throw new Error(verifyJson.error ?? "Payment verification failed.");
            }
            window.location.reload();
          } catch (err: any) {
            toast({ title: "Payment verification failed", description: err.message, variant: "destructive" });
          }
        },
        theme: { color: "#4f46e5" },
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: "Couldn't start checkout", description: err.message ?? "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button className="w-full" onClick={onClick} disabled={loading}>
      {loading ? "Starting checkout..." : "Switch to this plan"}
    </Button>
  );
}
