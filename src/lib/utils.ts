import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format paise (integer) as an INR currency string, e.g. 150000 -> "₹1,500.00" */
export function formatPaise(paise: number | null | undefined): string {
  const rupees = (paise ?? 0) / 100;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(rupees);
}

export function formatNumber(n: number | null | undefined): string {
  return new Intl.NumberFormat("en-IN").format(n ?? 0);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function currentPeriodKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  DEAD: "Dead",
};

// Built on the theme's CSS-variable tokens (not fixed Tailwind color scales)
// so these badges look right in both light and dark mode.
export const LEAD_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-muted text-muted-foreground",
  CONTACTED: "bg-accent-blue/10 text-accent-blue",
  QUALIFIED: "bg-accent-violet/10 text-accent-violet",
  NEGOTIATION: "bg-accent-amber/10 text-accent-amber",
  WON: "bg-success/10 text-success",
  LOST: "bg-accent-rose/10 text-accent-rose",
  DEAD: "bg-muted text-muted-foreground",
};
