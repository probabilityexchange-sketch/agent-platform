import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/middleware";

export async function GET() {
  try {
    const auth = await requireAuth();

    const sessions = await prisma.chatSession.findMany({
      where: { userId: auth.userId },
      include: {
        agent: {
          select: { name: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    return handleAuthError(error);
  }
}
