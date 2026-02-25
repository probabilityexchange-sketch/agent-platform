const { PrismaClient } = require("@prisma/client");
const fs = require('fs');

function loadEnv(path) {
    if (!fs.existsSync(path)) return;
    const content = fs.readFileSync(path, 'utf8');
    content.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value.length > 0) {
            process.env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
        }
    });
}

loadEnv('.env.local');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

async function checkAgents() {
    const agents = await prisma.agentConfig.findMany();
    console.log(`Found ${agents.length} agents in database.`);
    agents.forEach(a => {
        console.log(`- ${a.name} (slug: ${a.slug}, tier: ${a.requiredTier})`);
    });

    if (agents.length === 0) {
        console.log("WARNING: No agents found. You might need to run the seed script.");
    }
}

checkAgents()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
