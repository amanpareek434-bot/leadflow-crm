"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Shopify needs a shop domain before OAuth can start, so "Connect" is a tiny form here. */
export function ShopifyConnectForm() {
  const [shop, setShop] = useState("");

  function onConnect() {
    const trimmed = shop.trim().toLowerCase();
    if (!trimmed.endsWith(".myshopify.com")) {
      alert("Enter your shop domain, e.g. mystore.myshopify.com");
      return;
    }
    // Full-page navigation — OAuth requires a top-level redirect, not fetch.
    window.location.href = `/api/integrations/shopify/oauth?shop=${encodeURIComponent(trimmed)}`;
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="mystore.myshopify.com"
        value={shop}
        onChange={(e) => setShop(e.target.value)}
        className="h-9 text-sm"
      />
      <Button size="sm" onClick={onConnect} disabled={!shop.trim()}>
        Connect
      </Button>
    </div>
  );
}
