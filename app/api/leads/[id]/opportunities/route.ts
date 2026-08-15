import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/auth-helpers";
import { serializeLead } from "@/lib/leads";
import { findOpportunities } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const opportunities = await findOpportunities(serializeLead(existing));

    const lead = await prisma.lead.update({
      where: { id },
      data: { opportunities, opportunitiesGeneratedAt: new Date() },
    });
    return NextResponse.json({ lead: serializeLead(lead) });
  } catch (err) {
    return errorResponse(err);
  }
}
