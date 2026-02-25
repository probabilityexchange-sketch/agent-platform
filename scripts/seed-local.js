const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const researchTools = JSON.stringify({
        toolkits: ["hackernews", "coinmarketcap"],
        tools: [],
    });

    const codeTools = JSON.stringify({
        toolkits: ["github"],
        tools: [],
    });

    const productivityTools = JSON.stringify({
        toolkits: ["googlecalendar", "slack", "notion", "gmail", "prompmate"],
        tools: [],
    });

    // 1. Research Assistant
    await prisma.agentConfig.upsert({
        where: { slug: "research-assistant" },
        update: { tools: researchTools },
        create: {
            id: "agent_research",
            slug: "research-assistant",
            name: "Research Assistant",
            description: "Specializes in web search, content summarization, and deep research across the internet using real-time data.",
            image: "randi/research-assistant",
            internalPort: 80,
            tokensPerHour: 0,
            memoryLimit: 0,
            cpuLimit: 0,
            systemPrompt: "You are an expert research assistant. Use search tools to find the most up-to-date and accurate information. Always cite your sources.",
            tools: researchTools,
            defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
            active: true,
        },
    });

    // 2. Code Assistant
    await prisma.agentConfig.upsert({
        where: { slug: "code-assistant" },
        update: { tools: codeTools },
        create: {
            id: "agent_code",
            slug: "code-assistant",
            name: "Code Assistant",
            description: "Your expert pair programmer. Can write, debug, and explain code across multiple languages with GitHub integration.",
            image: "randi/code-assistant",
            internalPort: 80,
            tokensPerHour: 0,
            memoryLimit: 0,
            cpuLimit: 0,
            systemPrompt: "You are an expert software engineer. Provide clean, efficient, and well-documented code. Use code interpreter for verification when needed.",
            tools: codeTools,
            defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
            active: true,
        },
    });

    // 3. Productivity Agent
    await prisma.agentConfig.upsert({
        where: { slug: "productivity-agent" },
        update: { tools: productivityTools },
        create: {
            id: "agent_productivity",
            slug: "productivity-agent",
            name: "Productivity Agent",
            description: "Connects to your tools like Google Calendar, Slack, and Notion to manage your schedule and communicate efficiently.",
            image: "randi/productivity-agent",
            internalPort: 80,
            tokensPerHour: 0,
            memoryLimit: 0,
            cpuLimit: 0,
            systemPrompt: "You are a highly efficient productivity assistant. Help the user manage their time and communications professionally.",
            tools: productivityTools,
            defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
            active: true,
        },
    });

    // 4. Randi Lead Agent (Orchestrator)
    const leadTools = JSON.stringify({
        toolkits: [],
        tools: ["delegate_to_specialist", "spawn_autonomous_developer"],
    });
    await prisma.agentConfig.upsert({
        where: { slug: "randi-lead" },
        update: { tools: leadTools },
        create: {
            id: "agent_lead",
            slug: "randi-lead",
            name: "Randi (Lead)",
            description: "The primary orchestrator of the Randi platform. Can handle general queries and delegate specialized tasks to expert agents.",
            image: "randi/lead-agent",
            internalPort: 80,
            tokensPerHour: 0,
            memoryLimit: 0,
            cpuLimit: 0,
            systemPrompt: "You are Randi, the lead agent platform director. Your job is to facilitate user requests. You have access to specialized agents: 'research-assistant', 'code-assistant', and 'productivity-agent'.",
            tools: leadTools,
            defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
            active: true,
        },
    });

    console.log("SEEDED LOCAL AGENTS SUCCESSFULLY.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
