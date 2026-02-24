import { NextResponse } from "next/server";
import { cleanupExpiredContainers } from "@/lib/docker/cleanup";

// This route should be protected by a CRON_SECRET header
export async function POST(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = request.headers.get("x-cron-secret");

    // Enforce authentication if CRON_SECRET is set
    if (cronSecret && headerSecret !== cronSecret) {
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
