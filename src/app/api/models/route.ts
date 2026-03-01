import { NextResponse } from "next/server";

export async function GET() {
    try {
        const apiKey = process.env.KILO_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing KILO_API_KEY" }, { status: 500 });
        }

        const response = await fetch("https://api.kilo.ai/v1/models", {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            next: { revalidate: 3600 } // Cache for an hour
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status}`);
        }

        const data = await response.json();

        // OpenAI format usually returns { object: "list", data: [{ id: "model-id", ... }] }
        const models = Array.isArray(data.data) ? data.data : [];

        // Sort: Free models first, then alphabetical
        const sortedModels = models.sort((a: any, b: any) => {
            const aFree = a.id.includes(":free");
            const bFree = b.id.includes(":free");
            if (aFree && !bFree) return -1;
            if (!aFree && bFree) return 1;
            return a.id.localeCompare(b.id);
        });

        return NextResponse.json({ models: sortedModels });
    } catch (error) {
        console.error("Error fetching models:", error);
        return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
    }
}
