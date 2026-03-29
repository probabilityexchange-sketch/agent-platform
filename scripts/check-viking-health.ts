import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const serverUrl = process.env.OPENVIKING_SERVER_URL;
  const apiKey = process.env.OPENVIKING_API_KEY;

  console.log("Checking OpenViking at:", serverUrl || "(unset)");

  if (!serverUrl || !apiKey) {
    console.error("ERROR: OpenViking environment variables are not set in .env.local");
    return;
  }

  try {
    const res = await fetch(`${serverUrl}/health`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (res.ok) {
        const data = await res.json();
        console.log("Health Check SUCCESS:", data);
    } else {
        console.error("Health Check FAILED:", res.status, await res.text());
    }
  } catch (e) {
    console.error("Health Check ERROR:", (e as any).message);
    if ((e as any).message.includes("fetch failed")) {
        console.log("TIP: The server might be down or unreachable from this environment.");
    }
  }
}

main();
