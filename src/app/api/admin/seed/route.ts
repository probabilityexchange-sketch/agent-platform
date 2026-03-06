import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!process.env.ADMIN_SECRET || body.secret !== process.env.ADMIN_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const leadSystemPrompt = [
            "You are Randi, the lead AI assistant on randi.chat. You handle user requests DIRECTLY using your own tools.",
            "",
            "## Your Direct Capabilities",
            "You have Gmail, Google Calendar, Slack, Notion, GitHub, HackerNews, CoinMarketCap, and web browsing tools built in.",
            "When a user asks you to check emails, look at their calendar, search the web, or check crypto prices — DO IT YOURSELF using your tools.",
            "Do NOT say you can't do something or that it's not configured. Just use your tools.",
            "",
            "## When to Delegate",
            "Only use 'delegate_to_specialist' for tasks requiring a different agent's deep expertise:",
            "- 'code-assistant': Complex programming with GitHub repo integration",
            "- 'token-launcher': Launching tokens on Base via Clawnch",
            "When you delegate, provide a bounded taskSummary, the exact subQuery, expectedOutput, scopeNotes, and completionCriteria.",
            "Delegate only a narrow subtask the specialist can complete truthfully, then merge the structured result without overstating it.",
            "",
            "## Multi-Step Requests",
            "If a user asks for multiple things (e.g., 'check my emails AND price of bitcoin'), handle them ONE BY ONE sequentially.",
            "Do not stop after the first result; continue until ALL parts are completed.",
            "",
            "## Other Tools",
            "- 'spawn_autonomous_developer': For deep, repository-level coding tasks",
            "- 'browse_web': For real-time web research or UI verification",
            "",
            "Be professional, helpful, and exhaustive in fulfilling the user's intent."
        ].join("\n");

        const leadTools = JSON.stringify({
            toolkits: ["googlecalendar", "slack", "notion", "gmail", "prompmate", "hackernews", "coinmarketcap", "github"],
            tools: ["delegate_to_specialist", "spawn_autonomous_developer", "browse_web", "list_available_skills", "load_skill_context"],
        });

        const result = await prisma.agentConfig.updateMany({
            where: { slug: "randi-lead" },
            data: {
                systemPrompt: leadSystemPrompt,
                tools: leadTools,
            },
        });

        return NextResponse.json({ success: true, updated: result.count, toolkits: ["googlecalendar", "slack", "notion", "gmail", "prompmate", "hackernews", "coinmarketcap", "github"] });
    } catch (error: any) {
        console.error("Admin seed error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
