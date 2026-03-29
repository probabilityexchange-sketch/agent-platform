import { Composio } from "@composio/core";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) {
    console.error("No API key found in .env.local");
    return;
  }
  console.log("API Key prefix:", apiKey.substring(0, 10) + "...");
  
  const client = new Composio({ apiKey });
  
  // Get current user/entity info
  try {
    console.log("\n=== Checking Composio API connection ===");
    
    // List connected accounts for a test entity
    const accounts = await client.connectedAccounts.list({
      userIds: ["debug-user-001"],
      limit: 50,
    });
    console.log("Accounts for 'debug-user-001':", accounts.items.length);
    
    // Now try with a known entity from your userId
    const testUserId = "test-auth-user"; // Replace with actual test
    const accounts2 = await client.connectedAccounts.list({
      userIds: [testUserId],
      limit: 50,
    });
    console.log(`Accounts for '${testUserId}':`, accounts2.items.length);
    
    // Get all connected accounts (no filter) to see what this API key has access to
    const allAccounts = await client.connectedAccounts.list({
      limit: 100,
    });
    console.log("\n=== ALL connected accounts for this API key ===");
    console.log("Total:", allAccounts.items.length);
    for (const account of allAccounts.items) {
      console.log(`  - ${(account as any).toolkit?.slug} | status: ${account.status} | entity: ${(account as any).userId}`);
    }
    
    // Get toolkits to verify API key is working
    const toolkits = await client.toolkits.get({ limit: 5 });
    console.log("\n=== Toolkits available ===");
    console.log("Count:", toolkits.length);
    
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
