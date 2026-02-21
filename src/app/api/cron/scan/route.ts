import { NextResponse } from "next/server";
import { runScanner } from "@/lib/payments/scanner";

// This route should be protected by a CRON_SECRET or similar in production
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (process.env.NODE_ENV === "production" && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const processed = await runScanner();
        return NextResponse.json({
            success: true,
            processedTransactions: processed,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Scanner cron failed:", error);
        return NextResponse.json({ error: "Scanner failed" }, { status: 500 });
    }
}
