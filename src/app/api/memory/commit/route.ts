import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getMemoryClient, isMemoryConfigured } from '@/lib/memory/client';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const userId = auth.userId;

    if (!isMemoryConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Memory system not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { sessionId, messages } = body;

    if (!sessionId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'sessionId and messages are required' },
        { status: 400 }
      );
    }

    const client = getMemoryClient();
    const result = await client.commitSession({ userId, sessionId, messages });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[memory/commit] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
