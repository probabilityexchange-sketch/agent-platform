import { NextResponse } from "next/server";

export async function GET() {
    try {
        const kiloKey = process.env.KILO_API_KEY;
        const openRouterKey = process.env.OPENROUTER_API_KEY;
        const apiKey = kiloKey || openRouterKey;

        if (!apiKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const baseUrl = kiloKey ? "https://api.kilo.ai/v1/models" : "https://openrouter.ai/api/v1/models";

        const response = await fetch(baseUrl, {
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
