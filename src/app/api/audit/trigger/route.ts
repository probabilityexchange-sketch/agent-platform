/**
 * POST /api/audit/trigger
 *
 * Secure webhook called by the randi.agency Firebase Cloud Function
 * whenever a new Free Audit form is submitted. Accepts lead data,
 * writes it to the Google Sheet (Audit Leads tab) with status PENDING,
 * and fires off an immediate Telegram ping to Billy so he knows a new
 * lead has landed. The employee-seo-auditor worker then picks it up
 * and enriches the row with the full AI SEO audit.
 *
 * Auth: Bearer token via AUDIT_WEBHOOK_SECRET env var.
 * CORS: Accepts requests from randi.agency and Firebase Functions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getComposioClient, resolveComposioUserId } from '@/lib/composio/client';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';

// ─── Schema ──────────────────────────────────────────────────────────────────
const auditTriggerSchema = z.object({
  businessName: z.string().min(1),
  businessType: z.string().optional().default(''),
  city: z.string().optional().default(''),
  website: z.string().url(),
  contactName: z.string().optional().default(''),
  email: z.string().email(),
  biggestChallenge: z.string().optional().default(''),
  docId: z.string().optional().default(''),
  source: z.string().default('randi-agency-form'),
});

export type AuditTriggerPayload = z.infer<typeof auditTriggerSchema>;

// ─── CORS helper ─────────────────────────────────────────────────────────────
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*', // Firebase Functions call server-side, so wildcard is safe
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Rate limit by IP
  const ip = req.headers.get('x-forwarded-for') || 'anonymous';
  const { allowed } = await checkRateLimit(`audit-trigger:${ip}`, RATE_LIMITS.general);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders() });
  }

  // 2. Verify shared secret
  const webhookSecret = process.env.AUDIT_WEBHOOK_SECRET;
  if (webhookSecret) {
    const authHeader = req.headers.get('authorization') || '';
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }
  }

  // 3. Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders() });
  }

  const parsed = auditTriggerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid payload' },
      { status: 400, headers: corsHeaders() }
    );
  }

  const lead = parsed.data;
  const ts = new Date().toISOString();

  // 4. Get Composio client
  const composio = await getComposioClient();
  if (!composio) {
    console.error('[AuditTrigger] Composio client not available — COMPOSIO_API_KEY missing?');
    return NextResponse.json({ error: 'Audit pipeline offline' }, { status: 503, headers: corsHeaders() });
  }

  const SPREADSHEET_ID = process.env.AUDITOR_SPREADSHEET_ID;
  const ENTITY_ID = resolveComposioUserId('agency-bridge');

  if (!SPREADSHEET_ID) {
    console.error('[AuditTrigger] AUDITOR_SPREADSHEET_ID is not configured');
    return NextResponse.json({ error: 'Configuration error' }, { status: 500, headers: corsHeaders() });
  }

  console.log(`[AuditTrigger] New lead received: ${lead.businessName} (${lead.email})`);

  // 5. Write PENDING row to Google Sheets "Audit Leads" tab
  const sheetRow = [
    ts,
    lead.businessName,
    lead.businessType,
    lead.city,
    lead.website,
    lead.contactName,
    lead.email,
    lead.biggestChallenge,
    '',  // Lead Score     — Randi fills in
    '',  // GBP Verified   — Randi fills in
    '',  // GBP Rating     — Randi fills in
    '',  // GBP Reviews    — Randi fills in
    '',  // AI Overview    — Randi fills in
    '',  // Competitor 1   — Randi fills in
    '',  // Competitor 2   — Randi fills in
    '',  // Competitor 3   — Randi fills in
    '',  // Top Quick Win  — Randi fills in
    '',  // Audit Report   — Randi fills in
    'PENDING',
    lead.docId,
  ];

  try {
    await (composio as any).tools.execute('GOOGLESHEETS_APPEND_VALUES', {
      userId: ENTITY_ID,
      arguments: {
        spreadsheet_id: SPREADSHEET_ID,
        range: 'Audit Leads!A:T',
        values: [sheetRow],
      },
    });
    console.log(`[AuditTrigger] Row written to Sheets for ${lead.businessName}`);
  } catch (err: any) {
    console.error('[AuditTrigger] Failed to write to Sheets:', err.message);
    // Non-fatal — still send Telegram ping and return success
  }

  // 6. Telegram ping to Billy — immediate notification
  const adminChatId = process.env.AUDITOR_TELEGRAM_CHAT_ID;
  if (adminChatId) {
    try {
      await (composio as any).tools.execute('TELEGRAM_SEND_MESSAGE', {
        userId: ENTITY_ID,
        arguments: {
          chat_id: adminChatId,
          text:
            `🔥 *New Audit Request — Randi is on it!*\n\n` +
            `*Business:* ${lead.businessName}\n` +
            `*Type:* ${lead.businessType || 'N/A'}\n` +
            `*City:* ${lead.city || 'N/A'}\n` +
            `*Website:* ${lead.website}\n` +
            `*Contact:* ${lead.contactName} (${lead.email})\n` +
            `*Challenge:* ${lead.biggestChallenge || 'N/A'}\n\n` +
            `_Randi is running the AI SEO audit now. You'll get a full report shortly._`,
          parse_mode: 'Markdown',
        },
      });
      console.log(`[AuditTrigger] Telegram ping sent for ${lead.businessName}`);
    } catch (err: any) {
      console.warn('[AuditTrigger] Telegram ping failed:', err.message);
    }
  }

  return NextResponse.json(
    { success: true, message: 'Audit queued', lead: lead.businessName },
    { status: 200, headers: corsHeaders() }
  );
}
