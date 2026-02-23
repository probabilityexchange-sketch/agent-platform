import { prisma } from "@/lib/db/prisma";
import { openrouter } from "@/lib/openrouter/client";
import { getAgentToolsFromConfig, executeOpenAIToolCall } from "@/lib/composio/client";
import type OpenAI from "openai";

type ChatMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type ChatTool = OpenAI.Chat.Completions.ChatCompletionTool;

export const ORCHESTRATION_TOOLS: ChatTool[] = [
    {
        type: "function",
        function: {
            name: "delegate_to_specialist",
            description: "Delegates a specific task to a specialist agent.",
            parameters: {
                type: "object",
                properties: {
                    specialistSlug: {
                        type: "string",
                        enum: ["research-assistant", "code-assistant", "productivity-agent"],
                        description: "The slug of the specialist agent to delegate to.",
                    },
                    subQuery: {
                        type: "string",
                        description: "The specific prompt or instruction for the specialist.",
                    },
                },
                required: ["specialistSlug", "subQuery"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "spawn_autonomous_developer",
            description: "Launches an autonomous coding agent (using Composio Agent Orchestrator) to handle a complex repo-level task.",
            parameters: {
                type: "object",
                properties: {
                    project: {
                        type: "string",
                        description: "The name of the project or repo (e.g., 'agent-platform').",
                    },
                    task: {
                        type: "string",
                        description: "A detailed description of the coding task, bug fix, or feature to implement.",
                    },
                    agent: {
                        type: "string",
                        enum: ["claude-code", "aider", "openclaw"],
                        default: "claude-code",
                        description: "The underlying coding agent to use.",
                    },
                },
                required: ["project", "task"],
            },
        },
    },
];

export async function executeOrchestrationToolCall(
    userId: string,
    toolName: string,
    args: any,
    sessionId: string
): Promise<string> {
    if (toolName === "delegate_to_specialist") {
        const { specialistSlug, subQuery } = args;

        const agent = await prisma.agentConfig.findUnique({
            where: { slug: specialistSlug },
        });

        if (!agent) {
            return JSON.stringify({ error: `Specialist agent '${specialistSlug}' not found.` });
        }

        // Get tools for the specialist
        let specialistTools: ChatTool[] = [];
        if (agent.tools) {
            try {
                specialistTools = await getAgentToolsFromConfig(agent.tools, userId);
            } catch (err) {
                console.warn(`Failed to fetch tools for specialist ${specialistSlug}`, err);
            }
        }

        const messages: ChatMessageParam[] = [
            { role: "system", content: agent.systemPrompt },
            { role: "user", content: subQuery },
        ];

        try {
            // For orchestration, we'll do a one-shot tool-enabled call for the specialist
            // To keep it simple and avoid deep recursion in one request, we'll allow 
            // the specialist to use tools but we'll manage it here.

            const response = await openrouter.chat.completions.create({
                model: agent.defaultModel,
                messages,
                tools: specialistTools.length > 0 ? specialistTools : undefined,
            });

            const message = response.choices?.[0]?.message;
            if (!message) return "No response from specialist.";

            // If the specialist wants to call tools, we'll execute them and get the final answer
            // Note: In a production system, you'd want a more robust loop here.
            if (message.tool_calls && message.tool_calls.length > 0) {
                const toolResults = await Promise.all(
                    message.tool_calls.map(async (tc) => {
                        const result = await executeOpenAIToolCall(userId, tc);
                        return { role: "tool" as const, tool_call_id: tc.id, content: result };
                    })
                );

                const finalResponse = await openrouter.chat.completions.create({
                    model: agent.defaultModel,
                    messages: [...messages, message, ...toolResults],
                });

                return finalResponse.choices?.[0]?.message?.content || "Specialist completed task but returned no text.";
            }

            return message.content || "Specialist returned an empty response.";
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Orchestration failed";
            return JSON.stringify({ error: msg });
        }
    }

    if (toolName === "spawn_autonomous_developer") {
        const { project, task, agent = "claude-code" } = args;

        try {
            const bridgeUrl = process.env.COMPUTE_BRIDGE_URL;
            const bridgeKey = process.env.COMPUTE_BRIDGE_API_KEY;

            if (!bridgeUrl || !bridgeKey) {
                return JSON.stringify({ error: "Compute bridge is not configured." });
            }

            const response = await fetch(`${bridgeUrl}/spawn-ao`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-bridge-api-key": bridgeKey,
                },
                body: JSON.stringify({ project, task, agent }),
            });

            const result = await response.json();
            if (!response.ok) {
                return JSON.stringify({ error: result.error || "Failed to spawn autonomous developer." });
            }

            return `Successfully spawned an autonomous developer for project '${project}'. 
Task: ${task}
Agent: Aider (using OpenRouter Free Tier)
You can monitor the progress on the dashboard: ${result.dashboardUrl}`;
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Failed to communicate with compute bridge";
            return JSON.stringify({ error: msg });
        }
    }

    return JSON.stringify({ error: `Unknown orchestration tool: ${toolName}` });
}

export function isOrchestrationTool(toolName: string): boolean {
    return ORCHESTRATION_TOOLS.some((t) => t.function.name === toolName);
}
