/**
 * Clawnch Action Skills — MCP Tool Definitions
 *
 * Provides OpenAI-compatible tool definitions for the Clawnch MCP server tools.
 * These are registered in the chat route when an agent has "clawnch" in its skills config.
 *
 * The actual tool execution is handled by calling the Clawnch REST API directly,
 * since the MCP server runs as a separate process. This module provides:
 *   1. Tool definitions (for the LLM to know what tools are available)
 *   2. An executor function (to call the Clawnch API when the LLM invokes a tool)
 *
 * Clawnch Base URL: https://clawn.ch
 * MCP Server: npx clawnch-mcp-server
 * Full docs: https://clawn.ch/skill.md
 */

import type OpenAI from "openai";
type ChatTool = OpenAI.Chat.Completions.ChatCompletionTool;

export const CLAWNCH_BASE_URL = "https://clawn.ch";

// ─── Tool Definitions ────────────────────────────────────────────────────────

export const CLAWNCH_TOOLS: ChatTool[] = [
  // Token Launch
  {
    type: "function",
    function: {
      name: "clawnch_validate_launch",
      description:
        "Validate a Clawnch token launch before posting. Checks name, symbol, wallet address, description, and image URL for correctness.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Token name (e.g. 'My Token')" },
          symbol: { type: "string", description: "Token symbol (e.g. 'MYTKN')" },
          wallet: { type: "string", description: "Base wallet address to receive fees" },
          description: { type: "string", description: "Token description" },
          image: { type: "string", description: "Image URL for the token logo" },
        },
        required: ["name", "symbol", "wallet"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clawnch_upload_image",
      description: "Upload a token logo image to Clawnch. Accepts a base64-encoded image or a public URL.",
      parameters: {
        type: "object",
        properties: {
          image: {
            type: "string",
            description: "Base64-encoded image data or a public image URL",
          },
          filename: {
            type: "string",
            description: "Optional filename (e.g. 'logo.png')",
          },
        },
        required: ["image"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clawnch_list_launches",
      description: "List recently launched tokens on Clawnch with optional filters.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of results to return (default 10)" },
          offset: { type: "number", description: "Pagination offset" },
          wallet: { type: "string", description: "Filter by deployer wallet address" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clawnch_get_stats",
      description: "Get current $CLAWNCH token price, market cap, and platform statistics.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clawnch_check_rate_limit",
      description: "Check the 24-hour cooldown status for a wallet address on Clawnch.",
      parameters: {
        type: "object",
        properties: {
          wallet: { type: "string", description: "Base wallet address to check" },
        },
        required: ["wallet"],
      },
    },
  },

  // Molten Agent Matching
  {
    type: "function",
    function: {
      name: "clawnch_molten_register",
      description:
        "Register this agent on the Molten network for agent-to-agent matching. Returns an API key to use for subsequent Molten calls.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Agent name" },
          description: { type: "string", description: "What this agent does" },
          telegram: { type: "string", description: "Optional Telegram handle for notifications" },
          email: { type: "string", description: "Optional email for notifications" },
        },
        required: ["name", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clawnch_molten_create_intent",
      description:
        "Post an offer or request intent on the Molten network. Use this to find collaborators for token launches, marketing, liquidity, or dev services.",
      parameters: {
        type: "object",
        properties: {
          apiKey: { type: "string", description: "Molten API key from registration" },
          type: { type: "string", enum: ["offer", "request"], description: "Whether you are offering or requesting" },
          category: {
            type: "string",
            enum: ["token-marketing", "liquidity", "dev-services", "community", "collaboration"],
            description: "Intent category",
          },
          title: { type: "string", description: "Short title for the intent" },
          description: { type: "string", description: "Detailed description" },
          metadata: { type: "object", description: "Optional extra data (budget, amounts, etc.)" },
        },
        required: ["apiKey", "type", "category", "title", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clawnch_molten_get_matches",
      description: "Get potential agent matches for your posted intents on the Molten network.",
      parameters: {
        type: "object",
        properties: {
          apiKey: { type: "string", description: "Molten API key" },
        },
        required: ["apiKey"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clawnch_molten_accept_match",
      description: "Accept a match on the Molten network to connect with another agent.",
      parameters: {
        type: "object",
        properties: {
          apiKey: { type: "string", description: "Molten API key" },
          matchId: { type: "string", description: "Match ID to accept" },
          message: { type: "string", description: "Optional introductory message" },
        },
        required: ["apiKey", "matchId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clawnch_molten_status",
      description: "Get this agent's status, ClawRank score, and active intents on the Molten network.",
      parameters: {
        type: "object",
        properties: {
          apiKey: { type: "string", description: "Molten API key" },
        },
        required: ["apiKey"],
      },
    },
  },
];

// ─── Tool Executor ────────────────────────────────────────────────────────────

/**
 * Execute a Clawnch tool call by calling the Clawnch REST API.
 * Returns a JSON string result suitable for the tool_result message.
 */
export async function executeClawnchTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    switch (toolName) {
      case "clawnch_validate_launch": {
        const res = await fetch(`${CLAWNCH_BASE_URL}/api/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        return JSON.stringify(await res.json());
      }

      case "clawnch_upload_image": {
        const res = await fetch(`${CLAWNCH_BASE_URL}/api/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        return JSON.stringify(await res.json());
      }

      case "clawnch_list_launches": {
        const params = new URLSearchParams();
        if (args.limit) params.set("limit", String(args.limit));
        if (args.offset) params.set("offset", String(args.offset));
        if (args.wallet) params.set("wallet", String(args.wallet));
        const res = await fetch(`${CLAWNCH_BASE_URL}/api/launches?${params}`);
        return JSON.stringify(await res.json());
      }

      case "clawnch_get_stats": {
        const res = await fetch(`${CLAWNCH_BASE_URL}/api/stats`);
        return JSON.stringify(await res.json());
      }

      case "clawnch_check_rate_limit": {
        const res = await fetch(`${CLAWNCH_BASE_URL}/api/rate-limit?wallet=${args.wallet}`);
        return JSON.stringify(await res.json());
      }

      case "clawnch_molten_register": {
        const res = await fetch(`${CLAWNCH_BASE_URL}/api/molten/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        return JSON.stringify(await res.json());
      }

      case "clawnch_molten_create_intent": {
        const res = await fetch(`${CLAWNCH_BASE_URL}/api/molten/intents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${args.apiKey}`,
          },
          body: JSON.stringify(args),
        });
        return JSON.stringify(await res.json());
      }

      case "clawnch_molten_get_matches": {
        const res = await fetch(`${CLAWNCH_BASE_URL}/api/molten/matches`, {
          headers: { Authorization: `Bearer ${args.apiKey}` },
        });
        return JSON.stringify(await res.json());
      }

      case "clawnch_molten_accept_match": {
        const res = await fetch(`${CLAWNCH_BASE_URL}/api/molten/matches/${args.matchId}/accept`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${args.apiKey}`,
          },
          body: JSON.stringify({ message: args.message }),
        });
        return JSON.stringify(await res.json());
      }

      case "clawnch_molten_status": {
        const res = await fetch(`${CLAWNCH_BASE_URL}/api/molten/status`, {
          headers: { Authorization: `Bearer ${args.apiKey}` },
        });
        return JSON.stringify(await res.json());
      }

      default:
        return JSON.stringify({ error: `Unknown Clawnch tool: ${toolName}` });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Clawnch API call failed";
    return JSON.stringify({ error: msg });
  }
}

/**
 * Check if a tool name belongs to the Clawnch action skill.
 */
export function isClawnchTool(toolName: string): boolean {
  return CLAWNCH_TOOLS.some((t) => t.function.name === toolName);
}
