import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const agents = await prisma.agentConfig.findMany({
    where: { active: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      tokensPerHour: true,
      requiredTier: true,
      active: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ agents });
}
