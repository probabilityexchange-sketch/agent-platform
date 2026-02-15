import { Composio } from "@composio/core";

const apiKey = process.env.COMPOSIO_API_KEY;

if (!apiKey) {
    console.warn("COMPOSIO_API_KEY is not set in environment variables");
}

export const composio = apiKey ? new Composio({ apiKey }) : null;

export async function getAgentTools(toolNames: string[], userId?: string) {
    if (!composio || !toolNames || toolNames.length === 0) return [];
    const uid = userId || "default";
    if (toolNames.length === 1) {
        return composio.tools.get(uid, toolNames[0]);
    }
    return Promise.all(toolNames.map(name => composio.tools.get(uid, name)));
}
