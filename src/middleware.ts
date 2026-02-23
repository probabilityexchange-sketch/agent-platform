import { NextRequest, NextResponse } from "next/server";
import { isValidEdgeAuthToken } from "@/lib/auth/edge-token";

function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, method } = request.nextUrl;

  // Simple CSRF protection for mutating API requests
  if (pathname.startsWith("/api/") && ["POST", "DELETE", "PUT", "PATCH"].includes(method)) {
    const requestedWith = request.headers.get("x-requested-with");
    if (requestedWith?.toLowerCase() !== "xmlhttprequest") {
      return NextResponse.json(
        { error: "Forbidden: Missing or invalid X-Requested-With header" },
        { status: 403 }
      );
    }
  }

  const token = request.cookies.get("auth-token")?.value;

  const protectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/agents") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/containers") ||
    pathname.startsWith("/credits") ||
    pathname.startsWith("/integrations");

  if (protectedPath) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const valid = await isValidEdgeAuthToken(token);
    if (!valid) {
      return clearAuthCookie(NextResponse.redirect(new URL("/login", request.url)));
    }
  }

  if (pathname === "/login" && token) {
    const valid = await isValidEdgeAuthToken(token);
    if (valid) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return clearAuthCookie(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agents/:path*",
    "/chat/:path*",
    "/containers/:path*",
    "/credits/:path*",
    "/integrations/:path*",
    "/login",
  ],
};
