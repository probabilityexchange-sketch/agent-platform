import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/middleware";

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        const { agentId, sessionId } = await req.json();

        if (!agentId) {
            return NextResponse.json({ error: "agentId is required" }, { status: 400 });
        }

        // 1. Reset state to 'starting'
        await prisma.agentRuntime.upsert({
            where: {
                userId_agentId: {
                    userId: auth.userId,
                    agentId: agentId
                }
            },
            update: {
                state: "starting",
                updatedAt: new Date()
            },
            create: {
                userId: auth.userId,
                agentId: agentId,
                state: "starting"
            }
        });

        // 2. Fire and forget the provisioner call
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.get('host')}`;
        fetch(`${baseUrl}/api/runtimes/provision`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-auth': process.env.INTERNAL_API_SECRET || 'dev-secret'
            },
            body: JSON.stringify({
                userId: auth.userId,
                agentId: agentId,
                sessionId: sessionId
            })
        }).catch(err => console.error("Retry background provisioning failed:", err));

        return NextResponse.json({ success: true, message: "Retry initiated" });

    } catch (error) {
        return handleAuthError(error);
    }
}
