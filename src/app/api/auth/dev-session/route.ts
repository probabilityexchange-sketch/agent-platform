import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({
  wallet: z.string().min(1, "Wallet required"),
});

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS !== "true") {
    return NextResponse.json({ error: "Not enabled" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { wallet } = parsed.data;

  console.log("Establishing dev session for wallet:", wallet);

  const user = await prisma.user.upsert({
    where: { walletAddress: wallet },
    update: {},
    create: { walletAddress: wallet },
  });

  console.log("User found/created:", user.id);

  const token = await signToken(user.id, wallet);
  console.log("Token signed");

  const response = NextResponse.json({ ok: true });
  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 12 * 60 * 60,
    path: "/",
  });

  return response;
}
