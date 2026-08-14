import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin, errorResponse } from "@/lib/auth-helpers";
import { scrapeRunPostSchema } from "@/lib/validation";
import { createScrapeRun, NoAvailableApifyAccountError } from "@/lib/scrape-runs";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    const body = await req.json();
    const parsed = scrapeRunPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    const { searchTerm, locality, bypassCooldown } = parsed.data;

    if (bypassCooldown && session.user.role !== "admin") {
      return NextResponse.json({ error: "Only admins can bypass the cooldown" }, { status: 403 });
    }

    const result = await createScrapeRun({
      searchTerm,
      locality,
      requestedByUserId: session.user.id,
      bypassCooldown,
    });

    if (result.kind === "cooldown") {
      const existingLeadsCount = await prisma.lead.count({
        where: { locality: { equals: locality, mode: "insensitive" } },
      });
      return NextResponse.json({
        kind: "cooldown",
        lastRunId: result.lastRun.id,
        existingLeadsCount,
      });
    }

    return NextResponse.json({ kind: "started", scrapeRunId: result.scrapeRun.id });
  } catch (err) {
    if (err instanceof NoAvailableApifyAccountError) {
      return NextResponse.json({ error: "no_available_apify_account" }, { status: 503 });
    }
    return errorResponse(err);
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const runs = await prisma.scrapeRun.findMany({
      orderBy: { startedAt: "desc" },
      include: {
        requestedBy: { select: { name: true } },
        apifyAccount: { select: { label: true } },
      },
    });
    return NextResponse.json({ runs });
  } catch (err) {
    return errorResponse(err);
  }
}
