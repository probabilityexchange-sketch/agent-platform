import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: { sessionId: string } }
) {
    const { sessionId } = params;

    const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: {
            messages: {
                orderBy: { createdAt: "asc" }
            },
            agent: {
                select: { name: true }
            }
        }
    });

    if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
        messages: session.messages,
        agent: session.agent
    });
}
