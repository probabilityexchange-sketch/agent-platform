import { Composio } from "@composio/core";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) {
    console.error("No API key");
    return;
  }
  console.log("Using API key:", apiKey.substring(0, 10) + "...");
  
  const client = new Composio({ apiKey });
  
  // List connected accounts for a test userId
  try {
    const accounts = await client.connectedAccounts.list({
      userIds: ["test-user-debug"],
      limit: 50,
    });
    console.log("Connected accounts response:", JSON.stringify(accounts, null, 2));
  } catch (e) {
    console.error("Error listing accounts:", e);
  }
  
  // Get toolkits
  try {
    const toolkits = await client.toolkits.get({ limit: 100 });
    console.log("\nToolkits count:", toolkits.length);
    console.log("First 20 toolkits:", toolkits.map((t: any) => t.slug).slice(0, 20).join(", "));
  } catch (e) {
    console.error("Error getting toolkits:", e);
  }
}

main();
