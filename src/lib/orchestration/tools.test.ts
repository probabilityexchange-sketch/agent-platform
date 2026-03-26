import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
    prisma: {
        agentConfig: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
        },
        user: {
            findUnique: vi.fn(),
        },
    },
}));

vi.mock("@/lib/openrouter/client", () => ({
    openrouter: {},
    createChatCompletion: vi.fn(),
}));

vi.mock("@/lib/composio/client", () => ({
    getAgentToolsFromConfig: vi.fn().mockResolvedValue([]),
    executeOpenAIToolCall: vi.fn().mockResolvedValue("tool result"),
    composioToolsToOpenAI: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/credits/engine", () => ({
    deductForAgentCall: vi.fn(),
}));

vi.mock("@/lib/policy/service", () => ({
    evaluateAndRecordPolicy: vi.fn(),
}));

vi.mock("@/lib/compute/bridge-client", () => ({
    getBestBridgeNode: vi.fn(),
}));

vi.mock("@/lib/tokenomics", () => ({
    getCallCost: vi.fn().mockReturnValue({ finalCost: 100 }),
}));

vi.mock("@/lib/skills/manager", () => ({
    SkillManager: {
        listSkills: vi.fn().mockResolvedValue([]),
        getSkillContent: vi.fn().mockResolvedValue(null),
    },
}));

import {
    buildSpecialistDelegationPrompt,
    parseSpecialistResponseEnvelope,
    formatSpecialistResponse,
    executeOrchestrationToolCall,
    type DelegateToSpecialistArgs,
    type SpecialistResponseEnvelope,
} from "@/lib/orchestration/tools";
import { prisma } from "@/lib/db/prisma";
import { createChatCompletion } from "@/lib/openrouter/client";
import { deductForAgentCall } from "@/lib/credits/engine";
import { evaluateAndRecordPolicy } from "@/lib/policy/service";
import { executeOpenAIToolCall } from "@/lib/composio/client";
import { getCallCost } from "@/lib/tokenomics";

// ── Shared fixture ────────────────────────────────────────────────────────────

const baseArgs: DelegateToSpecialistArgs = {
    specialistSlug: "research-assistant",
    taskSummary: "Check two market data sources for BTC headline moves",
    subQuery: "Inspect the latest BTC headlines and summarize catalysts from two sources.",
    expectedOutput: {
        format: "structured_findings",
        sections: ["completedWork", "output", "evidence", "blockedBy", "unresolved"],
    },
    scopeNotes: ["Use only the assigned research tools.", "Do not give trading advice."],
    completionCriteria: ["Stop after two sources are checked.", "Report if a source is unavailable."],
};

const mockAgent = {
    slug: "research-assistant",
    systemPrompt: "You are a research specialist.",
    defaultModel: "openai/gpt-4o-mini",
    tools: null,
};

// ── Pure function tests ───────────────────────────────────────────────────────

it("buildSpecialistDelegationPrompt includes bounded contract details", () => {
    const prompt = buildSpecialistDelegationPrompt(baseArgs);

    expect(prompt).toMatch(/Delegated task summary: Check two market data sources/);
    expect(prompt).toMatch(/Expected output format: structured_findings/);
    expect(prompt).toMatch(/Scope notes:/);
    expect(prompt).toMatch(/Completion criteria:/);
    expect(prompt).toMatch(/Return only valid JSON matching this shape:/);
    expect(prompt).toMatch(/Do not simulate tool results/);
});

it("parseSpecialistResponseEnvelope preserves structured completion details", () => {
    const envelope = parseSpecialistResponseEnvelope(
        JSON.stringify({
            status: "partial",
            completedWork: ["Checked CoinMarketCap headlines", "Reviewed one browser snapshot"],
            output: "BTC moved after ETF flow commentary, but the second source timed out.",
            evidence: [
                { kind: "tool_call", detail: "COINMARKETCAP_GET_CRYPTO_NEWS" },
                { kind: "url", detail: "https://example.com/btc-news" },
            ],
            blockedBy: ["Second source returned a timeout"],
            unresolved: ["Need confirmation from another independent source"],
        }),
        baseArgs
    );

    expect(envelope.specialistSlug).toBe("research-assistant");
    expect(envelope.status).toBe("partial");
    expect(envelope.completedWork).toEqual(["Checked CoinMarketCap headlines", "Reviewed one browser snapshot"]);
    expect(envelope.evidence.length).toBe(2);
    expect(envelope.blockedBy).toEqual(["Second source returned a timeout"]);
    expect(envelope.unresolved).toEqual(["Need confirmation from another independent source"]);
});

it("parseSpecialistResponseEnvelope marks unstructured text as unresolved raw handoff", () => {
    const envelope = parseSpecialistResponseEnvelope("Looked around and found some things.", baseArgs);

    expect(envelope.status).toBe("failed");
    expect(envelope.output).toBe("Looked around and found some things.");
    expect(envelope.completedWork).toEqual([]);
    expect(envelope.unresolved[0]).toMatch(/unstructured/i);
});

it("formatSpecialistResponse returns human readable markdown", () => {
    const envelope: SpecialistResponseEnvelope = {
        specialistSlug: "token-launcher",
        status: "completed",
        role: "token launch specialist",
        delegatedTask: "Launch $RANDI token on Base",
        completedWork: ["Validated parameters", "Generated !clawnch post"],
        output: "The token launch post is ready. Please post it to Moltbook.",
        evidence: [],
        blockedBy: [],
        unresolved: [],
    };

    const formatted = formatSpecialistResponse(envelope);

    expect(formatted).toMatch(/✅ \*TOKEN LAUNCH SPECIALIST REPORT\*/);
    expect(formatted).toMatch(/Launch \$RANDI token on Base/);
    expect(formatted).toMatch(/The token launch post is ready/);
    expect(formatted).toMatch(/- Validated parameters/);
    expect(formatted).toMatch(/- Generated !clawnch post/);
});

it("formatSpecialistResponse handles blocked status with emoji", () => {
    const envelope: SpecialistResponseEnvelope = {
        specialistSlug: "research-assistant",
        status: "blocked",
        role: "research specialist",
        delegatedTask: "Find price of $RANDI",
        completedWork: [],
        output: "I could not find the price.",
        evidence: [],
        blockedBy: ["API is down"],
        unresolved: ["Price remains unknown"],
    };

    const formatted = formatSpecialistResponse(envelope);

    expect(formatted).toMatch(/🛑 \*RESEARCH SPECIALIST REPORT\*/);
    expect(formatted).toMatch(/\*Blocked By:\*/);
    expect(formatted).toMatch(/- API is down/);
    expect(formatted).toMatch(/\*Unresolved Issues:\*/);
    expect(formatted).toMatch(/- Price remains unknown/);
});

// ── Orchestration integration tests ──────────────────────────────────────────

describe("runSpecialistDelegation - credit deduction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns failed envelope when deductForAgentCall reports insufficient credits", async () => {
        vi.mocked(prisma.agentConfig.findUnique).mockResolvedValue(mockAgent as any);
        vi.mocked(deductForAgentCall).mockResolvedValue({ success: false, cost: 500 } as any);

        const result = await executeOrchestrationToolCall("user1", "delegate_to_specialist", {
            ...baseArgs,
        }, "session1");

        const envelope = JSON.parse(result) as SpecialistResponseEnvelope;
        expect(envelope.status).toBe("failed");
        expect(envelope.blockedBy).toContain("Insufficient credits");
        expect(envelope.output).toMatch(/Insufficient credits/i);
    });
});

describe("runSpecialistDelegation - maxTurns enforcement", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.agentConfig.findUnique).mockResolvedValue(mockAgent as any);
        vi.mocked(deductForAgentCall).mockResolvedValue({ success: true, cost: 100 } as any);
        vi.mocked(evaluateAndRecordPolicy).mockResolvedValue({ decision: "allow" } as any);
        vi.mocked(executeOpenAIToolCall).mockResolvedValue("tool result");
    });

    it("stops after maxTurns=1 even when specialist keeps requesting tools", async () => {
        // Always returns tool calls → loop would run forever without maxTurns guard
        vi.mocked(createChatCompletion).mockResolvedValue({
            choices: [{
                message: {
                    content: null,
                    tool_calls: [{ id: "tc1", type: "function", function: { name: "SOME_TOOL", arguments: "{}" } }],
                },
            }],
        } as any);

        await executeOrchestrationToolCall("user1", "delegate_to_specialist", {
            ...baseArgs,
            maxTurns: 1,
        }, "session1");

        expect(createChatCompletion).toHaveBeenCalledTimes(1);
    });

    it("stops after maxTurns=5 when specialist keeps requesting tools", async () => {
        vi.mocked(createChatCompletion).mockResolvedValue({
            choices: [{
                message: {
                    content: null,
                    tool_calls: [{ id: "tc1", type: "function", function: { name: "SOME_TOOL", arguments: "{}" } }],
                },
            }],
        } as any);

        await executeOrchestrationToolCall("user1", "delegate_to_specialist", {
            ...baseArgs,
            maxTurns: 5,
        }, "session1");

        expect(createChatCompletion).toHaveBeenCalledTimes(5);
    });

    it("stops after maxTurns=20 at the upper boundary", async () => {
        vi.mocked(createChatCompletion).mockResolvedValue({
            choices: [{
                message: {
                    content: null,
                    tool_calls: [{ id: "tc1", type: "function", function: { name: "SOME_TOOL", arguments: "{}" } }],
                },
            }],
        } as any);

        await executeOrchestrationToolCall("user1", "delegate_to_specialist", {
            ...baseArgs,
            maxTurns: 20,
        }, "session1");

        expect(createChatCompletion).toHaveBeenCalledTimes(20);
    });

    it("stops before maxTurns when specialist returns no tool calls", async () => {
        vi.mocked(createChatCompletion).mockResolvedValue({
            choices: [{
                message: {
                    content: JSON.stringify({ status: "completed", completedWork: [], output: "Done", evidence: [], blockedBy: [], unresolved: [] }),
                    tool_calls: undefined,
                },
            }],
        } as any);

        await executeOrchestrationToolCall("user1", "delegate_to_specialist", {
            ...baseArgs,
            maxTurns: 10,
        }, "session1");

        expect(createChatCompletion).toHaveBeenCalledTimes(1);
    });
});

describe("runSpecialistDelegation - policy gate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.agentConfig.findUnique).mockResolvedValue(mockAgent as any);
        vi.mocked(deductForAgentCall).mockResolvedValue({ success: true, cost: 100 } as any);
    });

    it("injects Policy Denied error into tool result when policy denies the call", async () => {
        const capturedMessages: any[] = [];

        vi.mocked(createChatCompletion).mockImplementation(async ({ messages }) => {
            capturedMessages.push(...messages);
            // First call: return a tool call
            if (capturedMessages.filter(m => m.role === "tool").length === 0) {
                return {
                    choices: [{
                        message: {
                            content: null,
                            tool_calls: [{ id: "tc1", type: "function", function: { name: "GMAIL_SEND_EMAIL", arguments: '{"to":"test@example.com"}' } }],
                        },
                    }],
                } as any;
            }
            // Second call: return final answer after receiving the denied tool result
            return {
                choices: [{
                    message: {
                        content: JSON.stringify({ status: "blocked", completedWork: [], output: "Blocked by policy", evidence: [], blockedBy: ["Policy Denied"], unresolved: [] }),
                        tool_calls: undefined,
                    },
                }],
            } as any;
        });

        vi.mocked(evaluateAndRecordPolicy).mockResolvedValue({
            decision: "deny",
            reason: "email sends are not permitted in automated contexts",
        } as any);

        const result = await executeOrchestrationToolCall("user1", "delegate_to_specialist", {
            ...baseArgs,
            maxTurns: 5,
        }, "session1");

        // Tool should not have been called (policy denied before executeOpenAIToolCall)
        expect(executeOpenAIToolCall).not.toHaveBeenCalled();

        const toolMessages = capturedMessages.filter(m => m.role === "tool");
        expect(toolMessages.length).toBeGreaterThan(0);
        expect(toolMessages[0].content).toContain("Policy Denied");
    });

    it("injects manual approval error when policy returns approve", async () => {
        const capturedMessages: any[] = [];

        vi.mocked(createChatCompletion).mockImplementation(async ({ messages }) => {
            capturedMessages.push(...messages);
            if (capturedMessages.filter(m => m.role === "tool").length === 0) {
                return {
                    choices: [{
                        message: {
                            content: null,
                            tool_calls: [{ id: "tc2", type: "function", function: { name: "WALLET_SEND_TOKEN", arguments: '{"amount":100}' } }],
                        },
                    }],
                } as any;
            }
            return {
                choices: [{
                    message: {
                        content: JSON.stringify({ status: "blocked", completedWork: [], output: "Needs approval", evidence: [], blockedBy: ["Approval required"], unresolved: [] }),
                        tool_calls: undefined,
                    },
                }],
            } as any;
        });

        vi.mocked(evaluateAndRecordPolicy).mockResolvedValue({ decision: "approve" } as any);

        await executeOrchestrationToolCall("user1", "delegate_to_specialist", {
            ...baseArgs,
            maxTurns: 5,
        }, "session1");

        expect(executeOpenAIToolCall).not.toHaveBeenCalled();
        const toolMessages = capturedMessages.filter(m => m.role === "tool");
        expect(toolMessages[0].content).toContain("manual approval");
    });
});

describe("conduct_specialists - pre-flight credit check", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects when user balance is below total estimated cost of all specialists", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ tokenBalance: 50 } as any);
        vi.mocked(prisma.agentConfig.findMany).mockResolvedValue([
            { slug: "research-assistant", defaultModel: "openai/gpt-4o-mini" },
            { slug: "seo-assistant", defaultModel: "openai/gpt-4o-mini" },
        ] as any);
        vi.mocked(getCallCost).mockReturnValue({ finalCost: 100 } as any);

        const result = await executeOrchestrationToolCall("user1", "conduct_specialists", {
            delegations: [
                { ...baseArgs, specialistSlug: "research-assistant" },
                { ...baseArgs, specialistSlug: "seo-assistant" },
            ],
        }, "session1");

        const parsed = JSON.parse(result);
        expect(parsed.error).toMatch(/Insufficient credits/i);
        expect(parsed.estimatedCost).toBe(200);
        expect(parsed.balance).toBe(50);
    });
});

describe("conduct_specialists - parallel result merging", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Sufficient balance
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ tokenBalance: 10_000 } as any);
        vi.mocked(prisma.agentConfig.findMany).mockResolvedValue([
            { slug: "research-assistant", defaultModel: "openai/gpt-4o-mini" },
            { slug: "seo-assistant", defaultModel: "openai/gpt-4o-mini" },
        ] as any);
        vi.mocked(getCallCost).mockReturnValue({ finalCost: 100 } as any);
        vi.mocked(prisma.agentConfig.findUnique).mockImplementation(async ({ where }: any) => ({
            slug: where.slug,
            systemPrompt: "You are a specialist.",
            defaultModel: "openai/gpt-4o-mini",
            tools: null,
        }) as any);
        vi.mocked(deductForAgentCall).mockResolvedValue({ success: true, cost: 100 } as any);
    });

    it("returns overall status=completed when all specialists complete successfully", async () => {
        vi.mocked(createChatCompletion).mockResolvedValue({
            choices: [{
                message: {
                    content: JSON.stringify({
                        status: "completed",
                        completedWork: ["Done"],
                        output: "All good",
                        evidence: [],
                        blockedBy: [],
                        unresolved: [],
                    }),
                    tool_calls: undefined,
                },
            }],
        } as any);

        const result = await executeOrchestrationToolCall("user1", "conduct_specialists", {
            delegations: [
                { ...baseArgs, specialistSlug: "research-assistant" },
                { ...baseArgs, specialistSlug: "seo-assistant" },
            ],
        }, "session1");

        const parsed = JSON.parse(result);
        expect(parsed.status).toBe("completed");
        expect(parsed.results).toHaveLength(2);
        expect(parsed.results[0].status).toBe("completed");
        expect(parsed.results[1].status).toBe("completed");
    });

    it("returns overall status=partial when at least one specialist fails", async () => {
        let callCount = 0;
        vi.mocked(createChatCompletion).mockImplementation(async () => {
            callCount++;
            const status = callCount === 1 ? "completed" : "failed";
            return {
                choices: [{
                    message: {
                        content: JSON.stringify({ status, completedWork: [], output: "result", evidence: [], blockedBy: [], unresolved: [] }),
                        tool_calls: undefined,
                    },
                }],
            } as any;
        });

        const result = await executeOrchestrationToolCall("user1", "conduct_specialists", {
            delegations: [
                { ...baseArgs, specialistSlug: "research-assistant" },
                { ...baseArgs, specialistSlug: "seo-assistant" },
            ],
        }, "session1");

        const parsed = JSON.parse(result);
        expect(parsed.status).toBe("partial");
        expect(parsed.results).toHaveLength(2);
    });

    it("returns error when no delegations are provided", async () => {
        const result = await executeOrchestrationToolCall("user1", "conduct_specialists", {
            delegations: [],
        }, "session1");

        const parsed = JSON.parse(result);
        expect(parsed.error).toMatch(/No delegations/i);
    });
});
