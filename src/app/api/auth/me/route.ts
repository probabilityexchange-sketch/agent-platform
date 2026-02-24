import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromCookies } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { isValidUsername } from "@/lib/utils/subdomain";

export async function GET() {
  const auth = await getAuthFromCookies();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      walletAddress: true,
      username: true,
      tokenBalance: true,
      tier: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user,
  });
}

const usernameSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Only lowercase letters, numbers, and hyphens"),
});

export async function PATCH(request: NextRequest) {
  const auth = await getAuthFromCookies();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = usernameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { username } = parsed.data;

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Username is invalid or reserved" },
      { status: 400 }
    );
  }

  // Check uniqueness
  const existing = await prisma.user.findUnique({
    where: { username },
  });
  if (existing && existing.id !== auth.userId) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 }
    );
  }

  const user = await prisma.user.update({
    where: { id: auth.userId },
    data: { username },
    select: {
      id: true,
      walletAddress: true,
      username: true,
      tokenBalance: true,
    },
  });

  return NextResponse.json({
    user,
  });
}
