import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { isBypassWallet } from "@/lib/credits/bypass";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";

const schema = z.object({
  wallet: z.string().min(1, "Wallet required"),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { wallet } = parsed.data;

  const devBypassEnabled = isDevAuthBypassEnabled();
  const isBypass = isBypassWallet(wallet);

  if (!devBypassEnabled && !isBypass) {
    return NextResponse.json({ error: "Not enabled" }, { status: 403 });
  }

  const user = await prisma.user.upsert({
    where: { walletAddress: wallet },
    update: {},
    create: { walletAddress: wallet },
  });

  const token = await signToken(user.id, wallet);

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
