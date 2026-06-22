import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always-public paths (the safety net mirrors the matcher logic)
  if (
    pathname.startsWith("/u/") ||
    pathname.startsWith("/api/public/") ||
    pathname === "/api/checkins" || // POST by members — no auth
    pathname === "/api/login" ||
    pathname === "/api/logout" ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Allow member-driven task toggles via the public path token, NOT here.
  // (Members never touch /api/tasks — they only POST /api/checkins and PATCH
  // their own tasks via /api/public/<slug>/tasks/<id>.)

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    // Don't redirect API calls — return 401 JSON so the client can react.
    if (pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/manager/:path*",
    "/api/members/:path*",
    "/api/tasks/:path*",
    "/api/questions/:path*",
    "/api/checkins/:path+", // PATCH/DELETE on /api/checkins/<id> (manager override). Bare POST stays public.
  ],
};
