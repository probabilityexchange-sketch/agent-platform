import { NextResponse } from "next/server";
import { runScanner } from "@/lib/payments/scanner";
import { runBurnService } from "@/lib/payments/burn-service";

// This route should be protected by a CRON_SECRET header
export async function POST(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = request.headers.get("x-cron-secret");

    // Enforce authentication if CRON_SECRET is set
    if (cronSecret && headerSecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const processed = await runScanner();
        const burnResult = await runBurnService();

        return NextResponse.json({
            success: true,
            processedTransactions: processed,
            burnResult: burnResult,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Scanner cron failed:", error);
        return NextResponse.json({ error: "Scanner failed" }, { status: 500 });
    }
}
