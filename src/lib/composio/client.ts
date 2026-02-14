import { ComposioToolSet } from "@composio/core";

const apiKey = process.env.COMPOSIO_API_KEY;

if (!apiKey) {
    console.warn("COMPOSIO_API_KEY is not set in environment variables");
}

export const composio = new ComposioToolSet({
    apiKey: apiKey,
});

/**
 * Helper to get tools by names from AgentConfig
 */
export async function getAgentTools(toolNames: string[]) {
    if (!toolNames || toolNames.length === 0) return [];

    // Composio allows fetching actions/tools by name
    // Note: Depending on the SDK version, the method might vary.
    // We'll use the common pattern for ComposioToolSet.
    return composio.getTools({ actions: toolNames });
}
