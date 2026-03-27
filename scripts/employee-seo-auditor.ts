/**
 * Randi Employee: The SEO Auditor
 *
 * Polls the "Audit Leads" Google Sheet for rows with status PENDING.
 * For each pending lead, runs a full AI SEO audit using Composio search
 * tools and an LLM, then:
 *   1. Updates the Google Sheet row with enriched data + audit report
 *   2. Sends a formatted Telegram summary to Billy so he can present
 *      it directly to the customer
 *
 * Run: npm run employee:seo-auditor
 * Or:  tsx scripts/employee-seo-auditor.ts
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
const TELEGRAM_CHAT_ID = process.env.AUDITOR_TELEGRAM_CHAT_ID;
const POLL_INTERVAL_MS = 60_000; // check every 60 seconds
const SHEET_TAB = 'Audit Leads';

// Column indices (0-based) matching the trigger route's row layout:
// A=Timestamp, B=BusinessName, C=BusinessType, D=City, E=Website,
// F=ContactName, G=Email, H=BiggestChallenge,
// I=LeadScore, J=GBPVerified, K=GBPRating, L=GBPReviews,
// M=AIOverview, N=Competitor1, O=Competitor2, P=Competitor3,
// Q=TopQuickWin, R=AuditReport, S=Status, T=DocId
const COL = {
  TIMESTAMP: 0,
  BUSINESS_NAME: 1,
  BUSINESS_TYPE: 2,
  CITY: 3,
  WEBSITE: 4,
  CONTACT_NAME: 5,
  EMAIL: 6,
  BIGGEST_CHALLENGE: 7,
  LEAD_SCORE: 8,
  GBP_VERIFIED: 9,
  GBP_RATING: 10,
  GBP_REVIEWS: 11,
  AI_OVERVIEW: 12,
  COMPETITOR_1: 13,
  COMPETITOR_2: 14,
  COMPETITOR_3: 15,
  TOP_QUICK_WIN: 16,
  AUDIT_REPORT: 17,
  STATUS: 18,
  DOC_ID: 19,
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
async function runSeoAuditor() {
  console.log('🚀 Randi SEO Auditor started...');

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
    try {
      console.log('🔍 Checking for pending audit leads...');

      // ── 1. Fetch all rows from the sheet ──────────────────────────────────
      const response = await (composio as any).tools.execute('GOOGLESHEETS_GET_VALUES', {
        userId: ENTITY_ID,
        arguments: {
          spreadsheet_id: SPREADSHEET_ID,
          range: `${SHEET_TAB}!A2:T200`,
        },
      });

      const rows: string[][] = response?.data?.values || [];
      console.log(`   Found ${rows.length} total rows.`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const status = row[COL.STATUS] || '';
        const rowIndex = i + 2; // 1-based, skipping header

        if (status !== 'PENDING') continue;

        const businessName = row[COL.BUSINESS_NAME] || '';
        const businessType = row[COL.BUSINESS_TYPE] || '';
        const city = row[COL.CITY] || '';
        const website = row[COL.WEBSITE] || '';
        const contactName = row[COL.CONTACT_NAME] || '';
        const email = row[COL.EMAIL] || '';
        const biggestChallenge = row[COL.BIGGEST_CHALLENGE] || '';

        console.log(`\n🎯 Auditing: ${businessName} (${website})`);

        try {
          // ── 2. Mark as PROCESSING ─────────────────────────────────────────
          await updateStatus(composio, ENTITY_ID, rowIndex, 'PROCESSING');

          // ── 3. Run the AI SEO audit ───────────────────────────────────────
          const auditResult = await runAuditForLead(composio, ENTITY_ID, {
            businessName,
            businessType,
            city,
            website,
            biggestChallenge,
          });

          // ── 4. Update the sheet row with enriched data ────────────────────
          await (composio as any).tools.execute('GOOGLESHEETS_UPDATE_VALUES', {
            userId: ENTITY_ID,
            arguments: {
              spreadsheet_id: SPREADSHEET_ID,
              range: `${SHEET_TAB}!I${rowIndex}:S${rowIndex}`,
              values: [[
                auditResult.leadScore,
                auditResult.gbpVerified,
                auditResult.gbpRating,
                auditResult.gbpReviews,
                auditResult.aiOverview,
                auditResult.competitor1,
                auditResult.competitor2,
                auditResult.competitor3,
                auditResult.topQuickWin,
                auditResult.auditReport,
                'COMPLETED',
              ]],
            },
          });

          console.log(`✅ Sheet updated for ${businessName}`);

          // ── 5. Send Telegram report to Billy ──────────────────────────────
          if (TELEGRAM_CHAT_ID) {
            const telegramMsg = buildTelegramReport({
              businessName,
              businessType,
              city,
              website,
              contactName,
              email,
              biggestChallenge,
              ...auditResult,
            });

            await (composio as any).tools.execute('TELEGRAM_SEND_MESSAGE', {
              userId: ENTITY_ID,
              arguments: {
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramMsg,
                parse_mode: 'Markdown',
              },
            });

            console.log(`📱 Telegram report sent for ${businessName}`);
          }

        } catch (auditErr: any) {
          console.error(`❌ Audit failed for ${businessName}:`, auditErr.message);
          await updateStatus(composio, ENTITY_ID, rowIndex, `ERROR: ${auditErr.message.slice(0, 80)}`);
        }
      }

    } catch (loopErr: any) {
      console.error('❌ Loop error:', loopErr.message);
    }

    console.log(`\n😴 Sleeping ${POLL_INTERVAL_MS / 1000}s before next check...\n`);
    await sleep(POLL_INTERVAL_MS);
  }
}

// ─── Core audit logic ─────────────────────────────────────────────────────────
interface LeadInput {
  businessName: string;
  businessType: string;
  city: string;
  website: string;
  biggestChallenge: string;
}

interface AuditResult {
  leadScore: string;
  gbpVerified: string;
  gbpRating: string;
  gbpReviews: string;
  aiOverview: string;
  competitor1: string;
  competitor2: string;
  competitor3: string;
  topQuickWin: string;
  auditReport: string;
}

async function runAuditForLead(
  composio: any,
  entityId: string,
  lead: LeadInput
): Promise<AuditResult> {
  const { businessName, businessType, city, website, biggestChallenge } = lead;

  // ── Step A: Search for business info and competitors ──────────────────────
  console.log('   🔎 Searching for business info...');
  let searchResults = '';
  try {
    const searchResponse = await (composio as any).tools.execute('GOOGLESEARCH_SEARCH', {
      userId: entityId,
      arguments: {
        query: `"${businessName}" ${businessType} ${city} Google Business Profile reviews`,
        num_results: 5,
      },
    });
    searchResults = JSON.stringify(searchResponse?.data || searchResponse || '');
  } catch (e: any) {
    console.warn('   ⚠️ Google Search unavailable, using LLM knowledge only:', e.message);
    searchResults = `Search unavailable. Using general knowledge for ${businessName} in ${city}.`;
  }

  // ── Step B: Search for competitors ───────────────────────────────────────
  console.log('   🔎 Searching for local competitors...');
  let competitorResults = '';
  try {
    const compResponse = await (composio as any).tools.execute('GOOGLESEARCH_SEARCH', {
      userId: entityId,
      arguments: {
        query: `top ${businessType} in ${city} near me site:google.com OR site:yelp.com`,
        num_results: 5,
      },
    });
    competitorResults = JSON.stringify(compResponse?.data || compResponse || '');
  } catch (e: any) {
    console.warn('   ⚠️ Competitor search unavailable:', e.message);
    competitorResults = `Competitor search unavailable.`;
  }

  // ── Step C: Check for AI Overview presence ────────────────────────────────
  console.log('   🔎 Checking AI Overview presence...');
  let aiOverviewResults = '';
  try {
    const aiOvResponse = await (composio as any).tools.execute('GOOGLESEARCH_SEARCH', {
      userId: entityId,
      arguments: {
        query: `best ${businessType} in ${city}`,
        num_results: 3,
      },
    });
    aiOverviewResults = JSON.stringify(aiOvResponse?.data || aiOvResponse || '');
  } catch (e: any) {
    aiOverviewResults = 'AI Overview check unavailable.';
  }

  // ── Step D: LLM synthesis — generate the full audit report ───────────────
  console.log('   🤖 Generating AI SEO audit report...');

  const systemPrompt = `You are Randi, an expert AI SEO auditor for local businesses. 
You analyze businesses and produce concise, actionable SEO audit reports that help agency owners close deals.
Your reports are honest, specific, and highlight the biggest opportunities.
Always respond in valid JSON only — no markdown, no explanation outside the JSON.`;

  const userPrompt = `Produce a complete AI SEO audit for this local business.

BUSINESS INFO:
- Name: ${businessName}
- Type: ${businessType}
- City: ${city}
- Website: ${website}
- Stated Challenge: ${biggestChallenge}

SEARCH DATA (business info):
${searchResults}

COMPETITOR SEARCH DATA:
${competitorResults}

AI OVERVIEW SEARCH DATA (for "${businessType} in ${city}"):
${aiOverviewResults}

Return a JSON object with EXACTLY these fields:
{
  "leadScore": "7",                        // 1-10 integer as string. 8-10 = hot lead, 5-7 = warm, 1-4 = cold
  "gbpVerified": "Yes",                    // "Yes", "No", or "Unknown"
  "gbpRating": "4.2",                      // Google rating as string, or "Unknown"
  "gbpReviews": "47",                      // Number of reviews as string, or "Unknown"
  "aiOverview": "No",                      // "Yes" if business appears in AI Overviews, "No", or "Unknown"
  "competitor1": "Competitor Name (4.8★, 120 reviews)",
  "competitor2": "Competitor Name (4.5★, 89 reviews)",
  "competitor3": "Competitor Name (4.3★, 55 reviews)",
  "topQuickWin": "Add schema markup to homepage — takes 30 min, high impact",
  "auditReport": "Full 3-5 sentence audit summary covering: current SEO health, biggest gaps, top 3 quick wins, and why this business is a good/bad fit for the agency. Be specific and actionable."
}`;

  const llmResponse = await llm.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });

  const rawContent = llmResponse.choices[0]?.message?.content || '{}';

  // Parse JSON — strip any accidental markdown fences
  let parsed: AuditResult;
  try {
    const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.warn('   ⚠️ LLM returned non-JSON, using fallback values');
    parsed = {
      leadScore: '5',
      gbpVerified: 'Unknown',
      gbpRating: 'Unknown',
      gbpReviews: 'Unknown',
      aiOverview: 'Unknown',
      competitor1: 'Unknown',
      competitor2: 'Unknown',
      competitor3: 'Unknown',
      topQuickWin: 'Manual review required',
      auditReport: rawContent.slice(0, 500),
    };
  }

  return parsed;
}

// ─── Telegram report formatter ────────────────────────────────────────────────
function buildTelegramReport(data: {
  businessName: string;
  businessType: string;
  city: string;
  website: string;
  contactName: string;
  email: string;
  biggestChallenge: string;
} & AuditResult): string {
  const score = parseInt(data.leadScore, 10);
  const scoreEmoji = score >= 8 ? '🔥' : score >= 5 ? '⚡' : '❄️';
  const scoreLabel = score >= 8 ? 'HOT LEAD' : score >= 5 ? 'WARM LEAD' : 'COLD LEAD';

  return (
    `${scoreEmoji} *AI SEO AUDIT COMPLETE — ${scoreLabel}*\n\n` +
    `*Business:* ${data.businessName}\n` +
    `*Type:* ${data.businessType || 'N/A'} | *City:* ${data.city || 'N/A'}\n` +
    `*Website:* ${data.website}\n` +
    `*Contact:* ${data.contactName} — ${data.email}\n\n` +
    `📊 *LEAD SCORE: ${data.leadScore}/10*\n\n` +
    `*GBP Status:* ${data.gbpVerified} | Rating: ${data.gbpRating}★ (${data.gbpReviews} reviews)\n` +
    `*AI Overview Presence:* ${data.aiOverview}\n\n` +
    `*Top Competitors:*\n` +
    `  1. ${data.competitor1}\n` +
    `  2. ${data.competitor2}\n` +
    `  3. ${data.competitor3}\n\n` +
    `⚡ *Top Quick Win:*\n${data.topQuickWin}\n\n` +
    `📋 *Audit Summary:*\n_${data.auditReport}_\n\n` +
    `_Challenge stated: "${data.biggestChallenge || 'N/A'}"_`
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function updateStatus(
  composio: any,
  entityId: string,
  rowIndex: number,
  status: string
) {
  await (composio as any).tools.execute('GOOGLESHEETS_UPDATE_VALUES', {
    userId: entityId,
    arguments: {
      spreadsheet_id: SPREADSHEET_ID,
      range: `${SHEET_TAB}!S${rowIndex}`,
      values: [[status]],
    },
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Entry point ──────────────────────────────────────────────────────────────
runSeoAuditor().catch(err => {
  console.error('CRITICAL ERROR:', err);
  process.exit(1);
});
