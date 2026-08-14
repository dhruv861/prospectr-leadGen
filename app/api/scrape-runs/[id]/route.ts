import { NextRequest, NextResponse } from "next/server";
import { requireSession, errorResponse } from "@/lib/auth-helpers";
import { pollAndCompleteScrapeRun } from "@/lib/scrape-runs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const scrapeRun = await pollAndCompleteScrapeRun(id);
    return NextResponse.json({ scrapeRun });
  } catch (err) {
    return errorResponse(err);
  }
}
