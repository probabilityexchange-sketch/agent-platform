import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
    // In a real app, verify user from Privy
    // const user = await getAuthFromPrivy(req);
    // Using a query param or header for now if middleware isn't ready
    const userId = req.nextUrl.searchParams.get("userId") || "anonymous";

    const sessions = await prisma.chatSession.findMany({
        where: { userId },
        include: {
            agent: {
                select: { name: true }
            }
        },
        orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ sessions });
}
