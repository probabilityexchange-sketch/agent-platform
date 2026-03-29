import { Composio } from "@composio/core";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const client = new Composio({ apiKey });
  
  // We'll check the "default" entity which we know has 1 account
  const defaultRes = await client.connectedAccounts.list({ userIds: ["default"] });
  console.log(`Entity 'default' has ${defaultRes.items.length} account(s).`);
  
  // We'll check a completely random ID to see if it's empty
  const randomId = "user_" + Math.random().toString(36).substring(7);
  const randomRes = await client.connectedAccounts.list({ userIds: [randomId] });
  console.log(`Random entity '${randomId}' has ${randomRes.items.length} account(s).`);

  if (defaultRes.items.length > 0 && randomRes.items.length === 0) {
      console.log("\nVERIFICATION SUCCESS: Tools ARE isolated per entity ID.");
      console.log("New users will NOT see tools from 'default' unless they are logged in as 'default'.");
  } else {
      console.log("\nVERIFICATION WARNING: Isolation behavior is unexpected.");
  }
}

main();
