import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/auth-helpers";
import { leadFiltersSchema } from "@/lib/validation";
import { buildLeadWhereClause, buildLeadOrderBy } from "@/lib/leads";

export async function GET(req: NextRequest) {
  try {
    await requireSession();

    const parsed = leadFiltersSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid filters", details: parsed.error.flatten() }, { status: 400 });
    }

    const where = buildLeadWhereClause(parsed.data);
    const leads = await prisma.lead.findMany({
      where,
      orderBy: buildLeadOrderBy(parsed.data.sortBy),
      take: parsed.data.limit ?? 200,
    });

    return NextResponse.json({ leads });
  } catch (err) {
    return errorResponse(err);
  }
}
