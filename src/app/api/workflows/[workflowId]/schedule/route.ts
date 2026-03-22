import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, handleAuthError } from '@/lib/auth/middleware';
import {
  getWorkflowScheduleByWorkflowId,
  pauseWorkflowSchedule,
  upsertWorkflowSchedule,
} from '@/lib/workflows/service';

const upsertScheduleSchema = z.object({
  cronExpression: z.string().min(1),
  timezone: z.string().min(1).default('UTC'),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const auth = await requireAuth();
    const { workflowId } = await params;
    const schedule = await getWorkflowScheduleByWorkflowId(auth.userId, workflowId);
    return NextResponse.json({ schedule });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const auth = await requireAuth();
    const { workflowId } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = upsertScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const result = await upsertWorkflowSchedule({
      userId: auth.userId,
      workflowId,
      cronExpression: parsed.data.cronExpression,
      timezone: parsed.data.timezone,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'WORKFLOW_NOT_FOUND') {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'INVALID_CRON_EXPRESSION') {
      return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 });
    }
    return handleAuthError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const auth = await requireAuth();
    const { workflowId } = await params;
    const schedule = await pauseWorkflowSchedule({
      userId: auth.userId,
      workflowId,
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    if (error instanceof Error && error.message === 'WORKFLOW_SCHEDULE_NOT_FOUND') {
      return NextResponse.json({ error: 'Workflow schedule not found' }, { status: 404 });
    }
    return handleAuthError(error);
  }
}
