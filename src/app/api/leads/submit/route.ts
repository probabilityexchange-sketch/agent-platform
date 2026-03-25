import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getComposioClient, resolveComposioUserId } from '@/lib/composio/client';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';

const leadSubmitSchema = z.object({
  businessName: z.string().min(1),
  businessType: z.string().optional(),
  city: z.string().optional(),
  website: z.string().url(),
  contactName: z.string().min(1),
  email: z.string().email(),
  biggestChallenge: z.string().optional(),
  source: z.string().default('randi-agency-form'),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting (Prevent bot spam)
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const { allowed } = await checkRateLimit(`lead-submit:${ip}`, RATE_LIMITS.general);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 2. Parse and Validate Input
    const body = await req.json();
    const result = leadSubmitSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const lead = result.data;
    const composio = await getComposioClient();
    if (!composio) {
      return NextResponse.json({ error: 'Lead processing system offline' }, { status: 503 });
    }

    const SPREADSHEET_ID = process.env.AUDITOR_SPREADSHEET_ID;
    const ENTITY_ID = resolveComposioUserId("agency-bridge");

    if (!SPREADSHEET_ID) {
      console.error('AUDITOR_SPREADSHEET_ID is not configured');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    // 3. Use Composio to bridge to Google Sheets (Bypassing CORS)
    console.log(`[Lead Bridge] Saving lead for ${lead.businessName} to Sheets...`);
    const sheetPromise = (composio as any).tools.execute('GOOGLESHEETS_APPEND_VALUES', {
      userId: ENTITY_ID,
      arguments: {
        spreadsheet_id: SPREADSHEET_ID,
        range: 'Sheet1!A:E',
        values: [
          [
            new Date().toISOString(),
            lead.email,
            lead.website,
            'PENDING', // Status for the Auditor Worker to pick up
            `Challenge: ${lead.biggestChallenge || 'N/A'} | Business: ${lead.businessName} (${lead.businessType || 'Unknown'})`,
          ],
        ],
      },
    });

    // 4. Use Composio to send Admin Notification via Telegram (Optional)
    const adminChatId = process.env.AUDITOR_TELEGRAM_CHAT_ID;
    const telegramPromise = adminChatId
      ? (composio as any).tools.execute('TELEGRAM_SEND_MESSAGE', {
          userId: ENTITY_ID,
          arguments: {
            chat_id: adminChatId,
            text: `🔥 *New Audit Request*\n\n*Business:* ${lead.businessName}\n*Contact:* ${lead.contactName}\n*Email:* ${lead.email}\n*Site:* ${lead.website}\n\n_Randi has added this to the audit queue._`,
            parse_mode: 'Markdown',
          },
        })
      : Promise.resolve();

    // Run both in parallel
    await Promise.all([sheetPromise, telegramPromise]);

    return NextResponse.json({ success: true, message: 'Lead processed successfully' });
  } catch (error: any) {
    console.error('Lead submission bridge error:', error.message);
    return NextResponse.json({ error: 'Internal processing error' }, { status: 500 });
  }
}

// Allow CORS for the randi.agency domain
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://randi.agency',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
