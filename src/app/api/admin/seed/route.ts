import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!process.env.ADMIN_SECRET || body.secret !== process.env.ADMIN_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const leadSystemPrompt = [
            "You are Randi, an elite AI employee operating on randi.chat. You handle real work on the internet — SEO, research, content, outreach, and automation — with the precision of a seasoned professional.",
            "",
            "## Your Primary Expertise: SEO",
            "You are built to be the best SEO operator in the business. When a user mentions a website, keyword, or ranking goal, default to your SEO Expert skill methodology. Your first client is randi.agency — know its rankings, track its health, and proactively surface opportunities.",
            "",
            "SEO task patterns:",
            "- \"audit [site]\" → run technical SEO audit using browse_web + produce structured report",
            "- \"research keywords for [topic]\" → use SerpAPI + DataForSEO, classify by intent, score by opportunity",
            "- \"write [page/post] for [keyword]\" → apply content framework, optimize for target keyword",
            "- \"analyze competitors for [site]\" → SerpAPI SERP analysis + backlink gap identification",
            "- \"check backlinks for [domain]\" → DataForSEO backlink summary + opportunity list",
            "",
            "## Tool Priority",
            "1. Answer directly if you already know it",
            "2. Use tools: browse_web for pages, SerpAPI for SERPs, DataForSEO for keyword/backlink data, Google Analytics for traffic",
            "3. Delegate to specialists for deep coding, token launches, or security audits",
            "4. Save outputs to Google Sheets/Docs for client delivery",
            "",
            "## Delegation",
            "Use orchestration tools for tasks requiring deep specialist expertise:",
            "- delegate_to_specialist: bounded subtasks for code, token launches, SEO deep dives, or security audits",
            "- conduct_specialists: run multiple specialists in parallel for independent subtasks",
            "- spawn_autonomous_developer: deep repository-level coding tasks",
            "",
            "When delegating, provide a clear taskSummary, subQuery, expectedOutput, scopeNotes, and completionCriteria. Merge results without overstating them.",
            "",
            "## Multi-Step Requests",
            "Handle all parts of a request. Use sequential execution for dependent steps, conduct_specialists for independent specialist tasks. Do not stop after the first result. Always deliver complete, actionable output."
        ].join("\n");

        const leadTools = JSON.stringify({
            toolkits: [
                "googlecalendar",
                "googlesheets",
                "googledocs",
                "googledrive",
                "slack",
                "notion",
                "gmail",
                "prompmate",
                "hackernews",
                "coinmarketcap",
                "github",
                "telegram",
                "serpapi",
                "googleanalytics",
            ],
            tools: [
                "delegate_to_specialist",
                "conduct_specialists",
                "spawn_autonomous_developer",
                "browse_web",
                "list_available_skills",
                "load_skill_context",
                "seo_keyword_data",
                "seo_backlinks_summary",
                "seo_serp_features",
            ],
            skills: ["audit-pipeline", "seo-expert"],
        });

        const result = await prisma.agentConfig.updateMany({
            where: { slug: "randi-lead" },
            data: {
                systemPrompt: leadSystemPrompt,
                tools: leadTools,
            },
        });

        return NextResponse.json({
            success: true,
            updated: result.count,
            toolkits: [
                "googlecalendar",
                "googlesheets",
                "googledocs",
                "googledrive",
                "slack",
                "notion",
                "gmail",
                "prompmate",
                "hackernews",
                "coinmarketcap",
                "github",
                "telegram",
                "serpapi",
                "googleanalytics",
            ],
        });
    } catch (error: any) {
        console.error("Admin seed error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
