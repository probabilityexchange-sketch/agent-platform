import { Composio } from "@composio/core";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const client = new Composio({ apiKey });
  
  const commonIds = ["agency-bridge", "seo-scout-employee", "auditor-employee", "lead-gen-employee", "default", "test-user-debug", "test-auth-user"];
  
  for (const id of commonIds) {
    try {
      const res = await client.connectedAccounts.list({ userIds: [id], limit: 10 });
      console.log(`ID: ${id} | Accounts: ${res.items.length}`);
    } catch (e) {
      console.error(`ID: ${id} | Error: ${(e as any).message}`);
    }
  }
}

main();
