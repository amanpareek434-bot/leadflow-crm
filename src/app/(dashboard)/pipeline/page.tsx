import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { LEAD_STATUS_LABELS } from "@/lib/utils";
import { PipelineBoard } from "./pipeline-board";
import type { LeadStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const leads = await prisma.lead.findMany({
    where: { organizationId },
    select: { id: true, name: true, phone: true, value: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const leadsByStatus: Record<string, typeof leads> = {};
  for (const status of Object.keys(LEAD_STATUS_LABELS)) {
    leadsByStatus[status] = leads.filter((l) => l.status === (status as LeadStatus));
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Leads grouped by status. Use the dropdown on a card to move it to another stage."
      />
      <PipelineBoard leadsByStatus={leadsByStatus} />
    </div>
  );
}
