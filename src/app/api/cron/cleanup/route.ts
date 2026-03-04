import { NextResponse } from "next/server";
import { cleanupExpiredContainers } from "@/lib/docker/cleanup";
import { isCronAuthorized } from "@/lib/utils/cron-auth";

// This route should be protected by a CRON_SECRET header
export async function POST(request: Request) {
    if (!isCronAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await cleanupExpiredContainers();
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Cleanup cron failed:", error);
        return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
    }
}
