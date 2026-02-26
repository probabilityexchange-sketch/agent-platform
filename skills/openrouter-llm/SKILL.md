---
name: openrouter-llm
description: "Provides expert guidance for using OpenRouter as a unified LLM gateway. Use for tasks involving model selection, streaming responses, tool calling, cost management, provider routing, and integration with the OpenAI-compatible API."
---

# OpenRouter LLM Skill

This skill equips Manus with the expertise to integrate and manage LLM calls via OpenRouter — a unified API gateway providing access to hundreds of models through a single OpenAI-compatible interface.

## Core Workflow

### 1. Model Selection

| Tier | Example Models | Best For |
| :--- | :--- | :--- |
| **Frontier** | `anthropic/claude-opus-4`, `openai/gpt-4o` | Complex reasoning, agentic tasks |
| **Mid-Tier** | `anthropic/claude-sonnet-4`, `google/gemini-2.5-flash` | Balanced capability and cost |
| **Fast/Cheap** | `openai/gpt-4o-mini`, `meta-llama/llama-3.1-8b-instruct` | High-volume, simple tasks |

### 2. Initialize the Client
```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://your-app.com",
    "X-Title": "Your App Name",
  },
});
```

### 3. Chat Completion
```typescript
const completion = await client.chat.completions.create({
  model: "anthropic/claude-sonnet-4",
  messages: [{ role: "user", content: "Explain quantum entanglement simply." }],
});
```

### 4. Streaming
```typescript
const stream = await client.chat.completions.create({
  model: "google/gemini-2.5-flash",
  messages: [{ role: "user", content: "Write a short story." }],
  stream: true,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}
```

### 5. Tool Calling
OpenRouter supports the standard OpenAI tool-calling format. Define tools as `{ type: "function", function: { name, description, parameters } }` and pass them in the `tools` array.

### 6. Provider Routing and Fallbacks
```typescript
// OpenRouter-specific provider routing
provider: { order: ["OpenAI", "Azure"], allow_fallbacks: true }
```

### 7. Cost Management
- Monitor usage at [openrouter.ai/activity](https://openrouter.ai/activity).
- Use `max_tokens` to cap response length.
- Use cheaper models for high-volume tasks; escalate to frontier only when needed.

## Key Resources
- **Reference:** `/home/ubuntu/skills/openrouter-llm/references/reference.md`
- **OpenRouter Docs:** [https://openrouter.ai/docs](https://openrouter.ai/docs)
