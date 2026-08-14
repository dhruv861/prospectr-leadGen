import { auth } from "@/auth";
import { NextResponse } from "next/server";

const ADMIN_ONLY_PREFIXES = ["/admin", "/api/apify-accounts"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const isAdminOnly = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  if (isAdminOnly && session.user.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/search/:path*",
    "/admin/:path*",
    "/api/leads/:path*",
    "/api/scrape-runs/:path*",
    "/api/apify-accounts/:path*",
  ],
};
