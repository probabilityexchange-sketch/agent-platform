import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    return;
  }
  
  try {
    const response = await fetch("https://backend.composio.dev/api/v3/auth/me", {
      headers: {
        "x-api-key": apiKey
      }
    });
    const data = await response.json();
    console.log("Auth Me (v3):", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main();
