import { NextResponse } from "next/server";
import { requireAdmin, errorResponse } from "@/lib/auth-helpers";
import { listAccountsWithLiveState } from "@/lib/apify-accounts";

export async function GET() {
  try {
    await requireAdmin();
    const accounts = await listAccountsWithLiveState();
    return NextResponse.json({ accounts });
  } catch (err) {
    return errorResponse(err);
  }
}
