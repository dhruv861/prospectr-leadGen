import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeLead } from "@/lib/leads";
import LeadDetailView from "./LeadDetailView";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) notFound();

  return <LeadDetailView lead={serializeLead(lead)} />;
}
