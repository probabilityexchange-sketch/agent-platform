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
  
  console.log("Client properties:", Object.keys(client));
  console.log("Client config:", JSON.stringify(client.config, null, 2));
  
  try {
     // Check if there's any method to get account info
     for (const key of Object.keys(client)) {
       if (key.toLowerCase().includes('user') || key.toLowerCase().includes('account') || key.toLowerCase().includes('org')) {
         console.log(`Found relevant key: ${key}`);
       }
     }
  } catch (e) {
    console.error(e);
  }
}

main();
