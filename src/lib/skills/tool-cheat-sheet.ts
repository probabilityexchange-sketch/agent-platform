export const KILO_COMPOSIO_CHEAT_SHEET = `
# Composio Toolkits Usage
When a user asks you to perform an action (e.g., "Create a GitHub issue"), follow this workflow:
1. Identify Tool: Look through your available functions to find the matching tool (e.g., \`googlecalendar_list_events\`, \`gmail_list_messages\`).
2. Call Directly: Use the standard 'tool_calls' mechanism to execute the specific tool directly. DO NOT use XML tags like <invoke>.
3. Handle Results: Use the data returned to answer the user's request.

## Service Specific Tips
- **GitHub**: Most tools require \`owner\` and \`repo\` names. If not provided, ask or list the user's repositories first.
- **Notion**: To query or insert into a database, you MUST first find the \`database_id\` using \`NOTION_SEARCH_NOTION_PAGE\` or \`NOTION_LIST_DATABASES\`. Do not guess IDs.
- **CoinMarketCap**: Use \`COINMARKETCAP_CRYPTOCURRENCY_LISTINGS_LATEST\` for general market rankings and volume. Use \`QUOTES_LATEST\` for specific coin prices.
- **Gmail**: If a tool requires \`label_ids\`, it MUST be an array (e.g., \`["INBOX"]\`), not a string.

# Minimax Format Requirement
If you are a Minimax model (m1.5, m2.5), you MUST output tool calls in the native 'tool_calls' JSON format. 
DO NOT use <invoke> or <parameter> XML tags.
The system ONLY supports the standard function-calling structure.
If you output XML, your request will FAIL.
`;
