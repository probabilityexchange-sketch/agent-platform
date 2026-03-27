/**
 * Randi Employee: The Site Monitor
 *
 * Runs daily/weekly on all COMPLETED leads in the "Audit Leads" sheet.
 * For each monitored business, it:
 *   1. Checks keyword rankings for their niche + city
 *   2. Looks for new competitors or ranking shifts
 *   3. Checks AI Overview presence
 *   4. Sends a Telegram alert to Billy if anything significant changed
 *      (e.g., a competitor overtook them, or a new opportunity appeared)
 *
 * Run: npm run employee:monitor
 * Or:  tsx scripts/employee-monitor.ts
 *
 * Required env vars:
 *   COMPOSIO_API_KEY
 *   COMPOSIO_ENTITY_ID  (or uses "agency-bridge" as default)
 *   AUDITOR_SPREADSHEET_ID
 *   AUDITOR_TELEGRAM_CHAT_ID
 *   OPENROUTER_API_KEY  (or OPENAI_API_KEY)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';
import { getComposioClient, resolveComposioUserId } from '../src/lib/composio/client';

// ─── Config ──────────────────────────────────────────────────────────────────
const SPREADSHEET_ID = process.env.AUDITOR_SPREADSHEET_ID;
const MONITOR_SPREADSHEET_ID = process.env.MONITOR_SPREADSHEET_ID || SPREADSHEET_ID;
const TELEGRAM_CHAT_ID = process.env.AUDITOR_TELEGRAM_CHAT_ID;
const POLL_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const AUDIT_SHEET_TAB = 'Audit Leads';
const MONITOR_SHEET_TAB = 'Monitor Log';

// Column indices for Audit Leads tab (same as auditor)
const COL = {
  BUSINESS_NAME: 1,
  BUSINESS_TYPE: 2,
  CITY: 3,
  WEBSITE: 4,
  CONTACT_NAME: 5,
  EMAIL: 6,
  LEAD_SCORE: 8,
  STATUS: 18,
};

// ─── LLM client ──────────────────────────────────────────────────────────────
const llm = new OpenAI({
  baseURL: process.env.OPENROUTER_API_KEY
    ? 'https://openrouter.ai/api/v1'
    : undefined,
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '',
});

const LLM_MODEL = process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini';

// ─── Main loop ────────────────────────────────────────────────────────────────
async function runMonitor() {
  console.log('🚀 Randi Site Monitor started...');

  if (!SPREADSHEET_ID) {
    console.error('❌ AUDITOR_SPREADSHEET_ID is not set. Exiting.');
    process.exit(1);
  }

  const composio = await getComposioClient();
  if (!composio) {
    console.error('❌ Composio client failed to initialize. Check COMPOSIO_API_KEY.');
    process.exit(1);
  }

  const ENTITY_ID = resolveComposioUserId('agency-bridge');

  while (true) {
    console.log('\n🔍 Starting monitoring cycle...');
    const cycleStart = new Date().toISOString();

    try {
      // ── 1. Fetch all COMPLETED leads ──────────────────────────────────────
      const response = await (composio as any).tools.execute('GOOGLESHEETS_GET_VALUES', {
        userId: ENTITY_ID,
        arguments: {
          spreadsheet_id: SPREADSHEET_ID,
          range: `${AUDIT_SHEET_TAB}!A2:T200`,
        },
      });

      const rows: string[][] = response?.data?.values || [];
      const completedLeads = rows.filter(row => row[COL.STATUS] === 'COMPLETED');

      console.log(`   Found ${completedLeads.length} completed leads to monitor.`);

      const alerts: string[] = [];

      for (const row of completedLeads) {
        const businessName = row[COL.BUSINESS_NAME] || '';
        const businessType = row[COL.BUSINESS_TYPE] || '';
        const city = row[COL.CITY] || '';
        const website = row[COL.WEBSITE] || '';
        const email = row[COL.EMAIL] || '';
        const previousScore = row[COL.LEAD_SCORE] || '5';

        if (!businessName || !website) continue;

        console.log(`\n📡 Monitoring: ${businessName} (${website})`);

        try {
          const monitorResult = await runMonitorCheck(composio, ENTITY_ID, {
            businessName,
            businessType,
            city,
            website,
            previousScore,
          });

          // ── Log to Monitor Log sheet ───────────────────────────────────────
          await (composio as any).tools.execute('GOOGLESHEETS_APPEND_VALUES', {
            userId: ENTITY_ID,
            arguments: {
              spreadsheet_id: MONITOR_SPREADSHEET_ID,
              range: `${MONITOR_SHEET_TAB}!A:G`,
              values: [[
                cycleStart,
                businessName,
                website,
                monitorResult.rankingStatus,
                monitorResult.aiOverviewStatus,
                monitorResult.alertLevel,
                monitorResult.summary,
              ]],
            },
          });

          // ── Collect alerts worth sending ───────────────────────────────────
          if (monitorResult.alertLevel === 'HIGH' || monitorResult.alertLevel === 'MEDIUM') {
            alerts.push(
              `*${businessName}* (${city})\n` +
              `⚠️ Alert: ${monitorResult.summary}\n` +
              `Contact: ${email}`
            );
          }

          console.log(`   ✅ Monitor check complete — Alert: ${monitorResult.alertLevel}`);

        } catch (monitorErr: any) {
          console.error(`   ❌ Monitor failed for ${businessName}:`, monitorErr.message);
        }

        // Small delay between checks to avoid rate limits
        await sleep(3000);
      }

      // ── 2. Send consolidated alert digest to Billy ────────────────────────
      if (alerts.length > 0 && TELEGRAM_CHAT_ID) {
        const digest =
          `📊 *Daily SEO Monitor Report — ${new Date().toLocaleDateString()}*\n\n` +
          `${alerts.length} business(es) need attention:\n\n` +
          alerts.join('\n\n---\n\n');

        await (composio as any).tools.execute('TELEGRAM_SEND_MESSAGE', {
          userId: ENTITY_ID,
          arguments: {
            chat_id: TELEGRAM_CHAT_ID,
            text: digest,
            parse_mode: 'Markdown',
          },
        });

        console.log(`\n📱 Alert digest sent — ${alerts.length} alerts`);
      } else if (TELEGRAM_CHAT_ID) {
        // Send a quiet daily confirmation
        await (composio as any).tools.execute('TELEGRAM_SEND_MESSAGE', {
          userId: ENTITY_ID,
          arguments: {
            chat_id: TELEGRAM_CHAT_ID,
            text: `✅ *Daily SEO Monitor — ${new Date().toLocaleDateString()}*\n\nAll ${completedLeads.length} monitored businesses look stable. No significant changes detected.`,
            parse_mode: 'Markdown',
          },
        });
      }

    } catch (loopErr: any) {
      console.error('❌ Monitor loop error:', loopErr.message);
    }

    console.log(`\n😴 Next monitoring cycle in 24 hours...\n`);
    await sleep(POLL_INTERVAL_MS);
  }
}

// ─── Monitor check logic ──────────────────────────────────────────────────────
interface MonitorInput {
  businessName: string;
  businessType: string;
  city: string;
  website: string;
  previousScore: string;
}

interface MonitorResult {
  rankingStatus: string;
  aiOverviewStatus: string;
  alertLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
}

async function runMonitorCheck(
  composio: any,
  entityId: string,
  lead: MonitorInput
): Promise<MonitorResult> {
  const { businessName, businessType, city, website } = lead;

  // Search for current ranking signals
  let searchData = '';
  try {
    const res = await (composio as any).tools.execute('GOOGLESEARCH_SEARCH', {
      userId: entityId,
      arguments: {
        query: `best ${businessType} in ${city}`,
        num_results: 10,
      },
    });
    searchData = JSON.stringify(res?.data || res || '');
  } catch (e: any) {
    searchData = 'Search unavailable.';
  }

  // LLM analysis
  const prompt = `You are an SEO monitoring agent. Analyze the following search results for "${businessType} in ${city}" and determine if "${businessName}" (${website}) is appearing, how it ranks vs competitors, and whether there are any significant changes or opportunities.

SEARCH RESULTS:
${searchData}

Return JSON with exactly these fields:
{
  "rankingStatus": "Ranking #3 in local pack" or "Not visible in top results",
  "aiOverviewStatus": "Present" or "Not present" or "Unknown",
  "alertLevel": "HIGH" or "MEDIUM" or "LOW",
  "summary": "One or two sentences explaining what changed or what opportunity exists. Be specific."
}

alertLevel guide:
- HIGH: Business dropped out of rankings, competitor overtook them, or a major opportunity appeared
- MEDIUM: Minor ranking shift or a new competitor entered the space
- LOW: No significant changes, business is stable`;

  const llmResponse = await llm.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 300,
  });

  const raw = llmResponse.choices[0]?.message?.content || '{}';
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      rankingStatus: 'Unknown',
      aiOverviewStatus: 'Unknown',
      alertLevel: 'LOW',
      summary: 'Monitor check completed — manual review recommended.',
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Entry point ──────────────────────────────────────────────────────────────
runMonitor().catch(err => {
  console.error('CRITICAL ERROR:', err);
  process.exit(1);
});
