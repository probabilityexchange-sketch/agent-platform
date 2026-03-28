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
    const { query, limit } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ success: false, error: 'query is required' }, { status: 400 });
    }

    const client = getMemoryClient();
    const [userResult, agentResult] = await Promise.all([
      client.recallMemories({ userId, query, limit }),
      client.recallAgentMemories(query),
    ]);

    const userContext = userResult.success ? userResult.data : '';
    const agentContext = agentResult.success ? agentResult.data : '';

    const combinedContext = [userContext, agentContext].filter(Boolean).join('\n\n---\n\n');

    return NextResponse.json({
      success: true,
      context: combinedContext,
      sources: {
        user: userResult.success,
        agent: agentResult.success,
      },
    });
  } catch (error) {
    console.error('[memory/recall] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
