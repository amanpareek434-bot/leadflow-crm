import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/utils";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ExportType = "leads" | "deals" | "whatsapp";
type ExportFormat = "csv" | "pdf";

async function buildRows(organizationId: string, type: ExportType): Promise<Record<string, string | number>[]> {
  if (type === "deals") {
    const deals = await prisma.deal.findMany({
      where: { organizationId },
      include: { lead: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    return deals.map((d) => ({
      title: d.title,
      lead: d.lead?.name ?? "",
      value: formatPaise(d.valuePaise),
      won: d.won === true ? "Won" : d.won === false ? "Lost" : "Open",
      closedAt: d.closedAt ? d.closedAt.toISOString() : "",
    }));
  }

  if (type === "whatsapp") {
    const messages = await prisma.whatsAppMessageLog.findMany({
      where: { organizationId },
      include: { template: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    return messages.map((m) => ({
      toPhone: m.toPhone,
      direction: m.direction,
      status: m.status,
      message: m.template?.name ?? m.body ?? "",
      createdAt: m.createdAt.toISOString(),
    }));
  }

  // default: leads
  const leads = await prisma.lead.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  return leads.map((l) => ({
    name: l.name,
    email: l.email ?? "",
    phone: l.phone ?? "",
    status: l.status,
    source: l.source,
    value: formatPaise(l.value),
    createdAt: l.createdAt.toISOString(),
  }));
}

// GET /api/reports/export?format=csv|pdf&type=leads|deals|whatsapp
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") ?? "csv") as ExportFormat;
    const type = (searchParams.get("type") ?? "leads") as ExportType;

    const rows = await buildRows(session.user.organizationId, type);

    if (format === "pdf") {
      const doc = new jsPDF();
      const columns = Object.keys(rows[0] ?? { message: "No data" });
      const body = rows.length ? rows.map((r) => Object.values(r).map((v) => String(v))) : [];
      autoTable(doc, { head: [columns], body });
      const arrayBuffer = doc.output("arraybuffer");

      return new Response(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${type}-export.pdf"`,
        },
      });
    }

    const csv = Papa.unparse(rows);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${type}-export.csv"`,
      },
    });
  } catch (err) {
    console.error("GET /api/reports/export failed", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
