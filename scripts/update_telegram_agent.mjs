import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const agentId = 'ac_v4N9yRNv91vz';
    const agent = await prisma.agentConfig.findUnique({ where: { id: agentId } });
    if (!agent) {
        console.error(`Agent ${agentId} not found`);
        return;
    }
    let tools = agent.tools || '[]';
    let parsed;
    try {
        parsed = JSON.parse(tools);
    } catch {
        parsed = [];
    }

    // Add TELEGRAM toolkit
    if (Array.isArray(parsed)) {
        if (!parsed.includes('TELEGRAM')) {
            parsed.push('TELEGRAM');
        }
    } else if (typeof parsed === 'object' && parsed !== null) {
        if (!parsed.toolkits) parsed.toolkits = [];
        if (!parsed.toolkits.includes('TELEGRAM')) {
            parsed.toolkits.push('TELEGRAM');
        }
    } else {
        parsed = ['TELEGRAM'];
    }

    const updatedTools = JSON.stringify(parsed);
    await prisma.agentConfig.update({
        where: { id: agentId },
        data: { tools: updatedTools }
    });
    console.log(`Successfully updated agent ${agentId} tools to include TELEGRAM.`);
}
main().catch(console.error).finally(async () => {
    await prisma.$disconnect();
});
