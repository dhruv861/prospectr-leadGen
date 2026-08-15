import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/auth-helpers";
import { serializeLead } from "@/lib/leads";
import { mineReviewPainPoints } from "@/lib/gemini";

// Two Gemini calls (research + structuring) can together take up to ~90s;
// Vercel Hobby's Fluid Compute default/max function duration is 300s, so
// this has real headroom.
export const maxDuration = 300;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const reviewPainPoints = await mineReviewPainPoints(serializeLead(existing));

    const lead = await prisma.lead.update({
      where: { id },
      data: { reviewPainPoints, reviewPainPointsGeneratedAt: new Date() },
    });
    return NextResponse.json({ lead: serializeLead(lead) });
  } catch (err) {
    return errorResponse(err);
  }
}
