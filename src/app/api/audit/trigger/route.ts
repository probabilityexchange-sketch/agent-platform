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
import { auditLeadSchema } from '@/lib/audit/schema';
import { queueAuditLead } from '@/lib/audit/queue';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';

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

  const parsed = auditLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid payload' },
      { status: 400, headers: corsHeaders() }
    );
  }

  const lead = parsed.data;

  console.log(`[AuditTrigger] New lead received: ${lead.businessName} (${lead.email})`);
  try {
    await queueAuditLead({
      ...lead,
      source: lead.source || 'randi-agency-form',
    });
    console.log(`[AuditTrigger] Row written to Sheets for ${lead.businessName}`);
  } catch (err: any) {
    console.error('[AuditTrigger] Failed to write to Sheets:', err.message);
    return NextResponse.json({ error: 'Audit pipeline offline' }, { status: 503, headers: corsHeaders() });
  }

  return NextResponse.json(
    { success: true, message: 'Audit queued', lead: lead.businessName },
    { status: 200, headers: corsHeaders() }
  );
}
