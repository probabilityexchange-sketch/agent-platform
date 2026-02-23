import { PrismaClient } from "@prisma/client";

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
  const researchAgent = await prisma.agentConfig.upsert({
    where: { slug: "research-assistant" },
    update: {
      tools: researchTools,
    },
    create: {
      slug: "research-assistant",
      name: "Research Assistant",
      description: "Specializes in web search, content summarization, and deep research across the internet using real-time data.",
      image: "randi/research-assistant",
      internalPort: 80,
      creditsPerHour: 0,
      memoryLimit: BigInt(0),
      cpuLimit: BigInt(0),
      systemPrompt: "You are an expert research assistant. Use search tools to find the most up-to-date and accurate information. Always cite your sources.",
      tools: researchTools,
      defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
      active: true,
    },
  });

  // 2. Code Assistant
  const codeAgent = await prisma.agentConfig.upsert({
    where: { slug: "code-assistant" },
    update: {
      tools: codeTools,
    },
    create: {
      slug: "code-assistant",
      name: "Code Assistant",
      description: "Your expert pair programmer. Can write, debug, and explain code across multiple languages with GitHub integration.",
      image: "randi/code-assistant",
      internalPort: 80,
      creditsPerHour: 0,
      memoryLimit: BigInt(0),
      cpuLimit: BigInt(0),
      systemPrompt: "You are an expert software engineer. Provide clean, efficient, and well-documented code. Use code interpreter for verification when needed.",
      tools: codeTools,
      defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
      active: true,
    },
  });

  // 3. Productivity Agent
  const productivityAgent = await prisma.agentConfig.upsert({
    where: { slug: "productivity-agent" },
    update: {
      tools: productivityTools,
    },
    create: {
      slug: "productivity-agent",
      name: "Productivity Agent",
      description: "Connects to your tools like Google Calendar, Slack, and Notion to manage your schedule and communicate efficiently.",
      image: "randi/productivity-agent",
      internalPort: 80,
      creditsPerHour: 0,
      memoryLimit: BigInt(0),
      cpuLimit: BigInt(0),
      systemPrompt: "You are a highly efficient productivity assistant. Help the user manage their time and communications professionally.",
      tools: productivityTools,
      defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
      active: true,
    },
  });

  // 4. Randi Lead Agent (Orchestrator)
  const leadAgent = await prisma.agentConfig.upsert({
    where: { slug: "randi-lead" },
    update: {
      tools: JSON.stringify({
        toolkits: [],
        tools: ["delegate_to_specialist", "spawn_autonomous_developer"],
      }),
    },
    create: {
      slug: "randi-lead",
      name: "Randi (Lead)",
      description: "The primary orchestrator of the Randi platform. Can handle general queries and delegate specialized tasks to expert agents.",
      image: "randi/lead-agent",
      internalPort: 80,
      creditsPerHour: 0,
      memoryLimit: BigInt(0),
      cpuLimit: BigInt(0),
      systemPrompt: "You are Randi, the lead agent platform director. Your job is to facilitate user requests. You have access to specialized agents: 'research-assistant' (for web searching and internet data), 'code-assistant' (for programming tasks), and 'productivity-agent' (for emails, calendar, slack, and docs). When a user request clearly falls into one of these domains, use the 'delegate_to_specialist' tool to get help.\n\nCrucially, for complex repository-level coding tasks, bug fixes, or new feature implementations, you have access to a specialized 'spawn_autonomous_developer' tool. This launches a background coding agent via the Agent Orchestrator that can work autonomously on deep code changes. Use this when the user asks for a 'fix', 'build', or 'implementation' that requires more than just a quick code snippet.\n\nBe professional, helpful, and concise.",
      tools: JSON.stringify({
        toolkits: [],
        tools: ["delegate_to_specialist", "spawn_autonomous_developer"],
      }),
      defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
      active: true,
    },
  });

  console.log("Seeded agents:", { researchAgent, codeAgent, productivityAgent, leadAgent });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
