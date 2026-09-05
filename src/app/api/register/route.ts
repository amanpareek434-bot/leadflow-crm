import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// Public sign-up: creates a brand-new Organization (tenant) + its first OWNER
// user + a 14-day trial Subscription on the Starter plan. This is what makes
// the product "user-wise" / sellable — every signup is an isolated tenant.

const schema = z.object({
  companyName: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { companyName, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  let slug = slugify(companyName) || "org";
  let suffix = 0;
  while (await prisma.organization.findUnique({ where: { slug: suffix ? `${slug}-${suffix}` : slug } })) {
    suffix += 1;
  }
  if (suffix) slug = `${slug}-${suffix}`;

  const starterPlan = await prisma.plan.findUnique({ where: { key: "starter" } });
  const passwordHash = await bcrypt.hash(password, 10);

  const org = await prisma.organization.create({
    data: {
      name: companyName,
      slug,
      users: {
        create: { name, email: email.toLowerCase().trim(), passwordHash, role: "OWNER" },
      },
      pipelines: {
        create: {
          name: "Sales Pipeline",
          isDefault: true,
          stages: {
            create: [
              { name: "New", order: 1, color: "#64748b" },
              { name: "Contacted", order: 2, color: "#3b82f6" },
              { name: "Qualified", order: 3, color: "#6366f1" },
              { name: "Negotiation", order: 4, color: "#f59e0b" },
              { name: "Won", order: 5, color: "#10b981" },
            ],
          },
        },
      },
      ...(starterPlan
        ? {
            subscription: {
              create: {
                planId: starterPlan.id,
                status: "TRIALING",
                trialEndsAt: new Date(Date.now() + 14 * 86400_000),
              },
            },
          }
        : {}),
    },
  });

  return NextResponse.json({ ok: true, organizationSlug: org.slug });
}
