import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/middleware";

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAuth();
        const url = new URL(req.url);
        const agentId = url.searchParams.get("agentId");

        if (!agentId) {
            return NextResponse.json({ error: "agentId is required" }, { status: 400 });
        }

        const runtime = await prisma.agentRuntime.findUnique({
            where: {
                userId_agentId: {
                    userId: auth.userId,
                    agentId: agentId
                }
            }
        });

        // Always return something, even if the DB record is missing.
        // If missing, it's 'shared' (not provisioned yet).
        if (!runtime) {
            return NextResponse.json({ state: "none", runtimeTarget: "shared" });
        }

        return NextResponse.json({
            ...runtime,
            runtimeTarget: runtime.state === 'active' ? 'dedicated' : 'shared'
        });
    } catch (error) {
        return handleAuthError(error);
    }
}
