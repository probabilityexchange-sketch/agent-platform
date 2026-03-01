export const KILO_COMPOSIO_CHEAT_SHEET = `
# Kilo API Gateway Setup
The Kilo AI Gateway is fully OpenAI-compatible. You can use the OpenAI SDK by pointing it to the Kilo base URL.

## Quickstart (Node.js/Vercel AI SDK)
1. Install dependencies: \`npm install ai @ai-sdk/openai dotenv\`
2. Set API Key in .env: \`KILO_API_KEY=your_api_key_here\`
3. Example Code:
\`\`\`javascript
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import "dotenv/config"

const kilo = createOpenAI({
  baseURL: "https://api.kilo.ai/api/gateway",
  apiKey: process.env.KILO_API_KEY,
})

async function main() {
  const result = streamText({
    model: kilo.chat("anthropic/claude-3.5-sonnet"),
    prompt: "Invent a new holiday and describe its traditions.",
  })
  for await (const textPart of result.textStream) {
    process.stdout.write(textPart)
  }
}
main().catch(console.error)
\`\`\`

# Composio Toolkits Usage
When a user asks you to perform an action (e.g., "Create a GitHub issue"), follow this workflow:
1. Search Tools: Call \`COMPOSIO_SEARCH_TOOLS\` to find the relevant tool (e.g., \`GITHUB_CREATE_ISSUE\`). It will return the connection status and input schema.
2. Authenticate (if needed): If the connection status is "not connected", call \`COMPOSIO_MANAGE_CONNECTIONS\` to prompt the user to authenticate. Wait for them to complete it.
3. Execute: Call \`COMPOSIO_MULTI_EXECUTE_TOOL\` to run the action.
4. Large Results: If the user needs to process many items (e.g., "label 100 emails"), use \`COMPOSIO_REMOTE_WORKBENCH\` (persistent Python sandbox) or \`COMPOSIO_REMOTE_BASH_TOOL\`.
`;
