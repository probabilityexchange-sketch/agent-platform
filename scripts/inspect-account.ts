import { Composio } from "@composio/core";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    return;
  }
  const client = new Composio({ apiKey });
  
  try {
    const allAccounts = await client.connectedAccounts.list({ limit: 5 });
    if (allAccounts.items.length > 0) {
       const firstAccountId = allAccounts.items[0].id;
       console.log("Fetching detailed account info for:", firstAccountId);
       // Try to get detailed info
       const detail = await (client.connectedAccounts as any).get?.(firstAccountId);
       console.log("Account detail keys:", Object.keys(detail));
       console.log("Entity property:", detail.entity || detail.userId || detail.entityId);
       console.log("Full account detail:", JSON.stringify(detail, null, 2));
    }
  } catch (e) {
    console.error(e);
  }
}

main();
