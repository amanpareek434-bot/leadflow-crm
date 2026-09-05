import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  MessageCircle,
  Megaphone,
  ShoppingBag,
  Sheet,
  Webhook,
  BarChart3,
  Users,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "Official WhatsApp automation",
    description:
      "Connect your official WhatsApp Business number and auto-send the right approved template the moment a lead goes Lost, Dead, or Won — you pick the template per status.",
  },
  {
    icon: Megaphone,
    title: "Meta & Google Ads sync",
    description: "Lead Ads and lead-form leads land in your pipeline automatically, plus a live spend/CPL dashboard for both platforms.",
  },
  {
    icon: ShoppingBag,
    title: "Shopify integration",
    description: "Customers and orders sync into your CRM as contacts and leads, so your store data lives next to your sales pipeline.",
  },
  {
    icon: Webhook,
    title: "Outgoing API & webhooks",
    description: "Push leads and deals to Google Sheets or your own ERP in real time — signed webhooks plus a documented REST API with per-org API keys.",
  },
  {
    icon: BarChart3,
    title: "Full downloadable reporting",
    description: "Conversion funnels, WhatsApp delivery rates, ads performance — every report exports to CSV or PDF in one click.",
  },
  {
    icon: Users,
    title: "Built for teams",
    description: "Multi-tenant from day one: invite your team, assign leads, set roles, and keep every customer's data completely isolated.",
  },
];

const INTEGRATIONS = [
  { name: "Meta Ads", color: "bg-blue-100 text-blue-700" },
  { name: "Google Ads", color: "bg-amber-100 text-amber-700" },
  { name: "Shopify", color: "bg-emerald-100 text-emerald-700" },
  { name: "WhatsApp Business", color: "bg-green-100 text-green-700" },
  { name: "Google Sheets", color: "bg-teal-100 text-teal-700" },
  { name: "Your ERP (Webhooks/API)", color: "bg-indigo-100 text-indigo-700" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),_transparent_60%)]" />
        <div className="container flex flex-col items-center gap-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> One CRM. Every channel. Zero manual follow-up.
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            The CRM that connects your <span className="text-primary">Ads, Shopify & WhatsApp</span> — automatically
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Import leads from Meta Ads, Google Ads & Shopify, auto-message lost or won leads on official WhatsApp with
            the template you choose, and pipe every record to Google Sheets or your ERP — all from one dashboard.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start your free trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">See pricing</Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">No credit card required · 14-day free trial · Cancel anytime</p>
        </div>
      </section>

      {/* Integrations strip */}
      <section id="integrations" className="border-y border-border/60 bg-muted/30 py-10">
        <div className="container">
          <p className="mb-6 text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Works with the tools you already run ads and sell on
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {INTEGRATIONS.map((i) => (
              <span key={i.name} className={`rounded-full px-4 py-2 text-sm font-medium ${i.color}`}>
                {i.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything your sales team needs, in one place</h2>
          <p className="mt-4 text-muted-foreground">
            Stop copy-pasting leads between ad platforms, spreadsheets, and your WhatsApp. LeadFlow keeps everything in sync.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Automation callout */}
      <section className="border-t border-border/60 bg-muted/30 py-24">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              <MessageCircle className="h-4 w-4" /> Official WhatsApp Business Platform
            </span>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">You decide which message goes to which lead</h2>
            <p className="mt-4 text-muted-foreground">
              Set a rule once — "Lost leads get Template A, Won leads get Template B" — and LeadFlow sends it
              automatically the moment a lead's status changes. Every send, delivery, and read receipt is logged.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Pick from your Meta-approved templates per lead status",
                "Optional delay before sending (e.g. 30 minutes after marked Lost)",
                "Full message log with delivery & read status",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-2">
            <CardContent className="space-y-3 p-4">
              {[
                { status: "LOST", label: "Lost Lead", template: "lost_lead_reengage", color: "bg-rose-100 text-rose-700" },
                { status: "DEAD", label: "Dead Lead", template: "dead_lead_offer", color: "bg-neutral-200 text-neutral-700" },
                { status: "WON", label: "Won Lead", template: "won_lead_thankyou", color: "bg-emerald-100 text-emerald-700" },
              ].map((r) => (
                <div key={r.status} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${r.color}`}>{r.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="rounded-md bg-muted px-2.5 py-1 font-mono text-xs">{r.template}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to stop losing leads in the gaps?</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Set up your pipeline, connect your ad accounts and WhatsApp, and start converting more leads today.
        </p>
        <Link href="/register">
          <Button size="lg" className="mt-8 gap-2">
            Create your free account <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>
    </>
  );
}
