import { Composio } from "@composio/core";
import type OpenAI from "openai";

const apiKey = process.env.COMPOSIO_API_KEY;

if (!apiKey) {
  console.warn("COMPOSIO_API_KEY is not set in environment variables");
}

export const composio = apiKey ? new Composio({ apiKey }) : null;

type OpenAITool = OpenAI.Chat.Completions.ChatCompletionTool;
type OpenAIToolCall = OpenAI.Chat.Completions.ChatCompletionMessageToolCall;

const MAX_TOOL_DEFINITIONS = 20;
const TOOL_SLUG_PATTERN = /^[A-Z0-9_]+$/;
const TOOLKIT_SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

const LEGACY_TOOLKIT_ALIASES: Record<string, string> = {
  github_api: "github",
  slack_api: "slack",
  notion_api: "notion",
  google_calendar: "googlecalendar",
  prompmate_api: "prompmate",
  promptmate_api: "prompmate",
  promptmate: "prompmate",
  coinmarketcap_api: "coinmarketcap",
  cmc_api: "coinmarketcap",
  cmc: "coinmarketcap",
};

interface ParsedAgentToolConfig {
  explicitTools: string[];
  toolkitHints: string[];
  fallbackTools: string[];
}

export function resolveComposioUserId(userId: string): string {
  const override = process.env.COMPOSIO_ENTITY_ID?.trim();
  if (override) return override;
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    throw new Error("Missing authenticated user id for Composio user mapping");
  }
  return normalizedUserId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return unique(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function normalizeToolkitHint(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  const mapped = LEGACY_TOOLKIT_ALIASES[normalized] ?? normalized;
  return TOOLKIT_SLUG_PATTERN.test(mapped) ? mapped : null;
}

function parseAgentToolConfig(
  rawConfig: string | null | undefined
): ParsedAgentToolConfig {
  if (!rawConfig) {
    return { explicitTools: [], toolkitHints: [], fallbackTools: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawConfig);
  } catch {
    return { explicitTools: [], toolkitHints: [], fallbackTools: [] };
  }

  if (Array.isArray(parsed)) {
    const values = normalizeStringList(parsed);
    const explicitTools = values.filter((value) => TOOL_SLUG_PATTERN.test(value));
    const toolkitHints = values
      .map(normalizeToolkitHint)
      .filter((value): value is string => Boolean(value));

    return {
      explicitTools: explicitTools.slice(0, MAX_TOOL_DEFINITIONS),
      toolkitHints: unique(toolkitHints).slice(0, MAX_TOOL_DEFINITIONS),
      fallbackTools: values.slice(0, MAX_TOOL_DEFINITIONS),
    };
  }

  if (!isRecord(parsed)) {
    return { explicitTools: [], toolkitHints: [], fallbackTools: [] };
  }

  const explicitTools = normalizeStringList(parsed.tools).slice(0, MAX_TOOL_DEFINITIONS);
  const toolkitHints = normalizeStringList(parsed.toolkits)
    .map(normalizeToolkitHint)
    .filter((value): value is string => Boolean(value))
    .slice(0, MAX_TOOL_DEFINITIONS);

  return {
    explicitTools,
    toolkitHints: unique(toolkitHints),
    fallbackTools: explicitTools,
  };
}

function isOpenAITool(value: unknown): value is OpenAITool {
  if (!isRecord(value) || value.type !== "function") return false;
  const fn = value.function;
  return isRecord(fn) && typeof fn.name === "string";
}

function toOpenAITools(value: unknown): OpenAITool[] {
  if (Array.isArray(value)) {
    return value.filter(isOpenAITool);
  }

  return isOpenAITool(value) ? [value] : [];
}

function dedupeTools(tools: OpenAITool[]): OpenAITool[] {
  const seen = new Set<string>();
  const deduped: OpenAITool[] = [];

  for (const tool of tools) {
    const key = tool.function.name;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(tool);
  }

  return deduped;
}

type ComposioToolQuery =
  | { kind: "tools"; tools: string[] }
  | { kind: "toolkits"; toolkits: string[] };

async function fetchToolsByQuery(
  userId: string,
  query: ComposioToolQuery
): Promise<OpenAITool[]> {
  if (!composio) return [];

  try {
    const tools = query.kind === "tools"
      ? await composio.tools.get(userId, { tools: query.tools })
      : await composio.tools.get(userId, {
          toolkits: query.toolkits,
          limit: MAX_TOOL_DEFINITIONS,
        });
    return toOpenAITools(tools);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Composio tool query failed", error);
    }
    return [];
  }
}

async function fetchToolBySlug(userId: string, slug: string): Promise<OpenAITool | null> {
  if (!composio) return null;

  try {
    const tool = await composio.tools.get(userId, slug);
    const wrappedTools = toOpenAITools(tool);
    return wrappedTools[0] ?? null;
  } catch {
    return null;
  }
}

export async function getAgentToolsFromConfig(
  rawConfig: string | null | undefined,
  userId: string
): Promise<OpenAITool[]> {
  if (!composio) return [];
  const resolvedUserId = resolveComposioUserId(userId);

  const parsed = parseAgentToolConfig(rawConfig);
  if (
    parsed.explicitTools.length === 0 &&
    parsed.toolkitHints.length === 0 &&
    parsed.fallbackTools.length === 0
  ) {
    return [];
  }

  const collectedTools: OpenAITool[] = [];

  if (parsed.explicitTools.length > 0) {
    collectedTools.push(
      ...(await fetchToolsByQuery(resolvedUserId, {
        kind: "tools",
        tools: parsed.explicitTools,
      }))
    );
  }

  if (parsed.toolkitHints.length > 0) {
    collectedTools.push(
      ...(await fetchToolsByQuery(resolvedUserId, {
        kind: "toolkits",
        toolkits: parsed.toolkitHints,
      }))
    );
  }

  if (collectedTools.length === 0) {
    for (const fallbackTool of parsed.fallbackTools) {
      const tool = await fetchToolBySlug(resolvedUserId, fallbackTool);
      if (tool) collectedTools.push(tool);
    }
  }

  return dedupeTools(collectedTools);
}

export async function executeOpenAIToolCall(
  userId: string,
  toolCall: OpenAIToolCall
): Promise<string> {
  if (!composio) {
    return JSON.stringify({ error: "COMPOSIO_API_KEY is not configured." });
  }
  const resolvedUserId = resolveComposioUserId(userId);

  try {
    return await composio.provider.executeToolCall(resolvedUserId, toolCall);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Tool execution failed";
    return JSON.stringify({
      error: message,
      tool: toolCall.function.name,
    });
  }
}
