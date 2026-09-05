import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding plans...");
  const [starter, growth, pro] = await Promise.all([
    prisma.plan.upsert({
      where: { key: "starter" },
      update: {},
      create: {
        key: "starter",
        name: "Starter",
        priceMonthlyPaise: 99900, // ₹999/mo
        maxUsers: 3,
        maxLeads: 1000,
        maxWhatsappPerMo: 500,
        features: ["3 team members", "1,000 leads", "500 WhatsApp messages/mo", "Email support"],
      },
    }),
    prisma.plan.upsert({
      where: { key: "growth" },
      update: {},
      create: {
        key: "growth",
        name: "Growth",
        priceMonthlyPaise: 249900, // ₹2,499/mo
        maxUsers: 10,
        maxLeads: 10000,
        maxWhatsappPerMo: 5000,
        features: ["10 team members", "10,000 leads", "5,000 WhatsApp messages/mo", "All integrations", "Priority support"],
      },
    }),
    prisma.plan.upsert({
      where: { key: "pro" },
      update: {},
      create: {
        key: "pro",
        name: "Pro",
        priceMonthlyPaise: 599900, // ₹5,999/mo
        maxUsers: 50,
        maxLeads: 100000,
        maxWhatsappPerMo: 50000,
        features: ["50 team members", "100,000 leads", "50,000 WhatsApp messages/mo", "All integrations", "Dedicated support"],
      },
    }),
  ]);

  console.log("Seeding demo organization...");
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Company", slug: "demo" },
  });

  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      planId: growth.id,
      status: "TRIALING",
      trialEndsAt: new Date(Date.now() + 14 * 86400_000),
    },
  });

  const passwordHash = await bcrypt.hash("Demo@1234", 10);
  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.com" },
    update: {},
    create: {
      organizationId: org.id,
      name: "Demo Owner",
      email: "owner@demo.com",
      passwordHash,
      role: "OWNER",
    },
  });

  const pipeline = await prisma.pipeline.upsert({
    where: { id: "demo-pipeline" },
    update: {},
    create: {
      id: "demo-pipeline",
      organizationId: org.id,
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
  });

  const existingLeads = await prisma.lead.count({ where: { organizationId: org.id } });
  if (existingLeads === 0) {
    await prisma.lead.createMany({
      data: [
        { organizationId: org.id, name: "Rahul Sharma", phone: "919800000001", email: "rahul@example.com", status: "NEW", source: "META_ADS", assignedToId: owner.id },
        { organizationId: org.id, name: "Priya Verma", phone: "919800000002", email: "priya@example.com", status: "CONTACTED", source: "GOOGLE_ADS", assignedToId: owner.id },
        { organizationId: org.id, name: "Amit Singh", phone: "919800000003", email: "amit@example.com", status: "LOST", source: "WEBSITE", assignedToId: owner.id },
        { organizationId: org.id, name: "Sneha Patel", phone: "919800000004", email: "sneha@example.com", status: "WON", source: "SHOPIFY", assignedToId: owner.id },
      ],
    });
  }

  console.log("Seeding a sample WhatsApp template + automation rule (Lost -> re-engagement)...");
  const template = await prisma.whatsAppTemplate.upsert({
    where: { id: "demo-template-lost" },
    update: {},
    create: {
      id: "demo-template-lost",
      organizationId: org.id,
      name: "lost_lead_reengage",
      language: "en_US",
      category: "MARKETING",
      bodyText: "Hi {{1}}, we noticed you couldn't move forward earlier — got 2 minutes to chat about a better fit?",
      variables: ["1"],
      status: "APPROVED",
    },
  });

  await prisma.automationRule.upsert({
    where: { organizationId_triggerStatus: { organizationId: org.id, triggerStatus: "LOST" } },
    update: {},
    create: { organizationId: org.id, triggerStatus: "LOST", templateId: template.id, delayMinutes: 0 },
  });

  console.log("\nDone.");
  console.log("Login with: owner@demo.com / Demo@1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
