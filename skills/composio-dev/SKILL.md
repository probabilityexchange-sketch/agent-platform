---
name: composio-dev
description: "Provides expert guidance for integrating Composio to build AI agents with tool-use capabilities. Use for tasks involving the Composio SDK (Python/TypeScript), sessions, authentication (OAuth, Connect Links), meta tools, triggers, and MCP integration."
---

# Composio Developer Skill

This skill equips Manus with the expertise to build and manage AI agents using the Composio platform. It provides a comprehensive workflow for integrating Composio, handling authentication, discovering and executing tools, and managing the entire agent lifecycle.

## Core Workflow

When a task requires building an AI agent with tool-use capabilities or connecting to external applications via Composio, follow this workflow.

### 1. Understand the Agent's Requirements

Clarify the agent's goals and the specific tools it will need:

*   **Core Functionality:** What is the primary purpose of the agent?
*   **Required Applications:** Which external services does the agent need to connect to? (e.g., Gmail, GitHub, Slack, Notion)
*   **User Interaction Model:** How will users interact with the agent?

### 2. Set Up the Composio Environment

```bash
# For Python with OpenAI Agents
pip install composio composio-openai-agents openai-agents
```

Ensure `COMPOSIO_API_KEY` and any LLM provider keys (e.g., `OPENAI_API_KEY`) are set as environment variables.

### 3. Initialize Composio and Create a Session

For each end-user, create a Composio session using a stable, unique `user_id`.

```python
from composio import Composio

composio = Composio()
session = composio.create(user_id="unique_user_id_from_your_app")
```

### 4. Fetch Tools and Build the Agent

Provide the agent with Composio's five meta tools via `session.tools()`. These meta tools allow the agent to dynamically discover and execute any of Composio's 1000+ integrations without needing to define them all upfront.

| Meta Tool | Purpose |
| :--- | :--- |
| `COMPOSIO_SEARCH_TOOLS` | Discover relevant tools by natural language |
| `COMPOSIO_MANAGE_CONNECTIONS` | Handle OAuth and authentication flows |
| `COMPOSIO_MULTI_EXECUTE_TOOL` | Execute one or more tools in parallel |
| `COMPOSIO_REMOTE_WORKBENCH` | Run Python code for complex data processing |
| `COMPOSIO_REMOTE_BASH_TOOL` | Run bash commands for file/data operations |

### 5. Handle Authentication

For most interactive agents, the default **in-chat authentication** is sufficient. The agent will automatically prompt the user with a Connect Link when a tool requires it. For non-interactive use cases, generate a Connect Link programmatically with `session.authorize()`.

### 6. Advanced Integration

*   **Triggers:** For event-driven agents (e.g., respond to new GitHub issues), set up Composio Triggers via webhooks.
*   **MCP Integration:** Retrieve the MCP endpoint from `session.mcp.url` and `session.mcp.headers` for MCP-compatible agents.

## Key Resources

*   **Comprehensive Reference:** `/home/ubuntu/skills/composio-dev/references/reference.md`
