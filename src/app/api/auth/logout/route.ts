import { NextResponse } from "next/server";
import { getAuthFromCookies } from "@/lib/auth/middleware";
import { revokeSession } from "@/lib/auth/jwt";

export async function POST() {
  const auth = await getAuthFromCookies();

  if (auth?.jti) {
    await revokeSession(auth.jti);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
