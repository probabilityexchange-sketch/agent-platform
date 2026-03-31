import { Composio } from "@composio/core";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const client = new Composio({ apiKey });
  
  try {
    const allAccounts = await client.connectedAccounts.list({ limit: 100 });
    console.log("Total accounts:", allAccounts.items.length);
    
    // We want to find the entity ID for each account
    // Since it's not in the list response, we'll try to find it by testing common IDs
    // Or we'll try to get it from the SDK if there's any other way
    
    // Wait, let's try to get all entities first
    const entitiesRes = await (client as any).client.request({
        method: "GET",
        url: "/v1/entities"
    });
    console.log("Entities response:", JSON.stringify(entitiesRes, null, 2));

  } catch (e) {
    console.error("Error:", (e as any).message);
    if ((e as any).response) {
       console.log("Response data:", (e as any).response.data);
    }
  }
}

main();
