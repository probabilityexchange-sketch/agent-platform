import { NextRequest, NextResponse } from "next/server";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const { pathname } = request.nextUrl;

  const devBypass = isDevAuthBypassEnabled();

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/agents") || pathname.startsWith("/containers") || pathname.startsWith("/credits")) {
    if (!token && !devBypass) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/agents/:path*", "/containers/:path*", "/credits/:path*", "/login"],
};
