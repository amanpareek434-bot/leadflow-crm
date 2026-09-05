import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { formatPaise } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthlyPaise: "asc" } });

  return (
    <div className="container py-24">
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
        <p className="mt-4 text-muted-foreground">Every plan includes all integrations. Upgrade any time as your team and lead volume grow.</p>
      </div>
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
        {plans.map((plan, i) => (
          <Card key={plan.id} className={i === 1 ? "border-primary shadow-lg ring-1 ring-primary" : ""}>
            <CardHeader>
              {i === 1 && (
                <span className="mb-2 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Most popular</span>
              )}
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <p className="text-3xl font-bold">
                {formatPaise(plan.priceMonthlyPaise)}
                <span className="text-base font-normal text-muted-foreground">/mo</span>
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {(plan.features as string[]).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/register" className="w-full">
                <Button className="w-full" variant={i === 1 ? "default" : "outline"}>
                  Start free trial
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
