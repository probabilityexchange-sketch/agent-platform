import { getComposioClient, resolveComposioUserId } from "../src/lib/composio/client";
import { execSync } from "child_process";

/**
 * Randi Employee: The Lead Gen Scout
 * 
 * This script scans Twitter/X (via Exa/Search) for potential technical leads
 * interested in code audits or Next.js help, and logs them to a Google Sheet.
 */

const LEAD_SHEET_ID = process.env.LEAD_GEN_SPREADSHEET_ID;
const SHEETS_ENTITY_ID = resolveComposioUserId("lead-gen-employee");
const POLL_INTERVAL_MS = 3600_000; // 1 hour (avoid spamming/rate limits)

const KEYWORDS = [
  "help with nextjs",
  "need solana audit",
  "smart contract security review",
  "prisma bug help",
  "technical cofounder needed nextjs"
];

async function runLeadGen() {
  console.log("🚀 Randi Lead Gen Scout started...");
  
  if (!LEAD_SHEET_ID) {
    console.error("❌ LEAD_GEN_SPREADSHEET_ID is not set.");
    process.exit(1);
  }

  const composio = await getComposioClient();
  if (!composio) {
    console.error("❌ Composio client failed to initialize.");
    process.exit(1);
  }

  while (true) {
    try {
      console.log(`[${new Date().toISOString()}] Scanning for new leads...`);
      
      for (const keyword of KEYWORDS) {
        console.log(`🔍 Searching for: "${keyword}"`);
        
        // 1. Search for recent tweets/posts using Exa
        // We use Exa because it's better at structured web search than basic Google
        const searchResponse = await (composio as any).tools.execute("EXA_SEARCH", {
          userId: SHEETS_ENTITY_ID,
          arguments: {
            query: `site:x.com ${keyword}`,
            num_results: 5,
            use_autoprompt: true,
          },
        });

        const results = searchResponse?.data?.results || [];
        
        for (const result of results) {
          const { url, title, text, published_date } = result;
          
          // 2. Log lead to Google Sheet
          // Sheet columns: Date, Source, Title/Text, URL, Status
          await (composio as any).tools.execute("GOOGLESHEETS_APPEND_VALUES", {
            userId: SHEETS_ENTITY_ID,
            arguments: {
              spreadsheet_id: LEAD_SHEET_ID,
              range: "Sheet1!A:E",
              values: [[
                new Date().toLocaleDateString(),
                "Twitter/X",
                title || text?.slice(0, 100),
                url,
                "NEW"
              ]],
            },
          });
          
          console.log(`✅ Logged lead: ${url}`);
        }
      }

      console.log("😴 Scan complete. Sleeping for 1 hour...");

    } catch (error: any) {
      console.error("❌ Lead Gen error:", error.message);
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

runLeadGen().catch(err => {
  console.error("CRITICAL ERROR:", err);
  process.exit(1);
});
