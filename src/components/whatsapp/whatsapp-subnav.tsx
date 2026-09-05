"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/whatsapp/templates", label: "Templates" },
  { href: "/whatsapp/automations", label: "Automations" },
  { href: "/whatsapp/inbox", label: "Inbox" },
];

export function WhatsAppSubnav() {
  const pathname = usePathname();
  return (
    <div className="mb-6 inline-flex h-10 items-center rounded-lg bg-muted p-1 text-muted-foreground">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              active ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
