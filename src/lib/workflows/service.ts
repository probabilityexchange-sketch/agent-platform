import { prisma } from '@/lib/db/prisma';
import {
  workflowPlanSchema,
  type WorkflowPlan,
  type WorkflowRunError,
  type WorkflowRunStatus,
  type WorkflowScheduleDeploymentBundle,
  type WorkflowSchedulePreview,
} from '@/lib/workflows/schema';
import {
  canStartWorkflowRun,
  deriveWorkflowSafety,
  determineRunnableStatus,
  normalizeWorkflowDbRecord,
  normalizeWorkflowRunDbRecord,
  normalizeWorkflowScheduleRecord,
  normalizeWorkflowRunRecord,
  serializeWorkflowError,
  serializeWorkflowPlan,
  serializeWorkflowRetryHistory,
  serializeWorkflowSafety,
  type WorkflowTriggerSource,
} from '@/lib/workflows/persistence';
import { createApprovalRequestFromPolicy, evaluateAndRecordPolicy } from '@/lib/policy/service';
import {
  buildGitHubActionsSchedulePreview,
  buildWorkflowScheduleDeploymentBundle,
  createWorkflowScheduleToken,
  getScheduleActivationOutcome,
  getWorkflowSchedulerTarget,
  hashWorkflowScheduleToken,
  isValidCronExpression,
} from '@/lib/workflows/scheduling';
import { estimateWorkflowRunCost, logWorkflowRunActualCost } from '@/lib/credits/estimator';

async function getWorkflowScheduleRowByWorkflowId(userId: string, workflowId: string) {
  return prisma.workflowSchedule.findFirst({
    where: { workflowId, userId },
  });
}

async function getWorkflowScheduleRowById(userId: string, scheduleId: string) {
  return prisma.workflowSchedule.findFirst({
    where: { id: scheduleId, userId },
  });
}

async function upsertWorkflowScheduleRow(params: {
  id: string;
  workflowId: string;
  userId: string;
  status: 'draft' | 'active' | 'paused' | 'blocked';
  cronExpression: string;
  timezone: string;
  schedulerTarget: string;
  deploymentState: 'pending_manual_sync' | 'synced' | 'blocked' | 'needs_resync';
  deploymentReason: string | null;
  githubWorkflowName: string;
  githubWorkflowPath: string;
  githubSecretName: string;
  triggerTokenHash: string;
  lastError: string | null;
}) {
  // We fetch first to ensure ownership if it exists
  const existing = await prisma.workflowSchedule.findUnique({
    where: { workflowId: params.workflowId },
  });

  if (existing && existing.userId !== params.userId) {
    throw new Error('WORKFLOW_SCHEDULE_OWNERSHIP_MISMATCH');
  }

  return prisma.workflowSchedule.upsert({
    where: { workflowId: params.workflowId },
    create: {
      id: params.id,
      workflowId: params.workflowId,
      userId: params.userId,
      status: params.status,
      cronExpression: params.cronExpression,
      timezone: params.timezone,
      schedulerTarget: params.schedulerTarget,
      deploymentState: params.deploymentState,
      deploymentReason: params.deploymentReason,
      githubWorkflowName: params.githubWorkflowName,
      githubWorkflowPath: params.githubWorkflowPath,
      githubSecretName: params.githubSecretName,
      triggerTokenHash: params.triggerTokenHash,
      lastError: params.lastError,
    },
    update: {
      status: params.status,
      cronExpression: params.cronExpression,
      timezone: params.timezone,
      schedulerTarget: params.schedulerTarget,
      deploymentState: params.deploymentState,
      deploymentReason: params.deploymentReason,
      githubWorkflowName: params.githubWorkflowName,
      githubWorkflowPath: params.githubWorkflowPath,
      githubSecretName: params.githubSecretName,
      triggerTokenHash: params.triggerTokenHash,
      lastError: params.lastError,
    },
  });
}

async function blockWorkflowScheduleAfterWorkflowChange(userId: string, scheduleId: string) {
  await prisma.workflowSchedule.update({
    where: { id_userId: { id: scheduleId, userId } },
    data: {
      status: 'blocked',
      deploymentState: 'needs_resync',
      deploymentReason:
        'Workflow changed. Re-evaluate policy and re-sync the GitHub Actions schedule before recurring runs continue.',
    },
  });
}

async function updateWorkflowScheduleOnDispatch(params: {
  userId: string;
  scheduleId: string;
  runId: string;
  blockedReason: string | null;
}) {
  await prisma.workflowSchedule.update({
    where: { id_userId: { id: params.scheduleId, userId: params.userId } },
    data: {
      lastTriggeredAt: new Date(),
      lastRunId: params.runId,
      lastError: params.blockedReason,
      consecutiveFailures: {
        increment: params.blockedReason ? 1 : 0,
      },
    },
  });
}

async function updateWorkflowScheduleOutcomeByRunId(params: {
  userId: string;
  runId: string;
  status: WorkflowRunStatus;
  message: string | null;
}) {
  const isCompleted = params.status === 'completed';
  const isFailure = ['failed', 'blocked', 'cancelled'].includes(params.status);

  // Note: We update by lastRunId which is a bit implicit but matches current logic.
  // In a more robust system we would have a direct relation or use scheduleId from the run.
  const schedule = await prisma.workflowSchedule.findFirst({
    where: { lastRunId: params.runId, userId: params.userId },
  });

  if (!schedule) return;

  await prisma.workflowSchedule.update({
    where: { id: schedule.id, userId: params.userId },
    data: {
      lastSuccessfulAt: isCompleted ? new Date() : undefined,
      lastError: isCompleted ? null : params.message,
      consecutiveFailures: isCompleted ? 0 : isFailure ? { increment: 1 } : undefined,
    },
  });
}

async function pauseWorkflowScheduleRow(workflowId: string, userId: string) {
  return prisma.workflowSchedule.update({
    where: { workflowId_userId: { workflowId, userId } },
    data: {
      status: 'paused',
      deploymentState: 'pending_manual_sync',
      deploymentReason: 'Schedule paused by user.',
    },
  });
}

export async function saveWorkflowDraft(params: {
  userId: string;
  plan: WorkflowPlan;
  workflowId?: string;
}) {
  const plan = workflowPlanSchema.parse(params.plan);
  const safety = deriveWorkflowSafety(plan);
  const status = determineRunnableStatus(plan, safety);

  const data = {
    title: plan.title,
    status,
    planJson: serializeWorkflowPlan(plan),
    safetyJson: serializeWorkflowSafety(safety),
  };

  const record = params.workflowId
    ? await prisma.workflow.update({
        where: {
          id_userId: {
            id: params.workflowId,
            userId: params.userId,
          },
        },
        data,
      })
    : await prisma.workflow.create({
        data: {
          userId: params.userId,
          ...data,
        },
      });

  if (params.workflowId) {
    const existingSchedule = await getWorkflowScheduleRowByWorkflowId(
      params.userId,
      params.workflowId
    );
    if (existingSchedule) {
      await blockWorkflowScheduleAfterWorkflowChange(params.userId, existingSchedule.id);
    }
  }

  const refreshed = await getWorkflowById(params.userId, record.id);
  if (!refreshed) {
    throw new Error('WORKFLOW_NOT_FOUND');
  }

  return refreshed;
}

export async function listWorkflows(userId: string) {
  const records = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  const schedules = await Promise.all(
    records.map(record => getWorkflowScheduleRowByWorkflowId(userId, record.id))
  );

  return records.map((record, index) =>
    normalizeWorkflowDbRecord({
      ...record,
      schedule: schedules[index],
    })
  );
}

export async function getWorkflowById(userId: string, workflowId: string) {
  const record = await prisma.workflow.findUnique({
    where: {
      id_userId: {
        id: workflowId,
        userId,
      },
    },
  });

  if (!record) return null;

  const schedule = await getWorkflowScheduleRowByWorkflowId(userId, workflowId);
  return normalizeWorkflowDbRecord({
    ...record,
    schedule,
  });
}

export async function createWorkflowRun(params: {
  userId: string;
  workflowId: string;
  triggerSource: WorkflowTriggerSource;
  scheduleId?: string;
  scheduledFor?: Date;
}) {
  const workflow = await prisma.workflow.findUnique({
    where: {
      id_userId: {
        id: params.workflowId,
        userId: params.userId,
      },
    },
  });

  if (!workflow) {
    throw new Error('WORKFLOW_NOT_FOUND');
  }

  const schedule = await getWorkflowScheduleRowByWorkflowId(params.userId, workflow.id);
  const latestRun = await prisma.workflowRun.findFirst({
    where: {
      workflowId: workflow.id,
      userId: params.userId,
    },
    orderBy: { createdAt: 'desc' },
  });
  const normalizedWorkflow = normalizeWorkflowDbRecord({
    ...workflow,
    schedule,
  });
  const nextAttemptNumber = (latestRun?.attemptNumber ?? 0) + 1;
  const policyDecision = await evaluateAndRecordPolicy({
    subjectType: 'workflow_run',
    actor: { userId: params.userId },
    triggerSource: params.triggerSource,
    workflowId: workflow.id,
    workflowTitle: normalizedWorkflow.title,
    workflowStatus: normalizedWorkflow.status,
    safety: normalizedWorkflow.safety,
  });

  const startDecision = canStartWorkflowRun({
    workflowStatus: normalizedWorkflow.status,
    safety: normalizedWorkflow.safety,
  });

  let resolvedStartDecision = startDecision;

  if (policyDecision.decision === 'approve') {
    await createApprovalRequestFromPolicy({
      userId: params.userId,
      workflowId: workflow.id,
      policyDecision,
    });
    resolvedStartDecision = {
      allowed: false,
      status: 'blocked',
      blockedReason: policyDecision.reason,
    };
  }

  if (policyDecision.decision === 'simulate' || policyDecision.decision === 'deny') {
    resolvedStartDecision = {
      allowed: false,
      status: 'blocked',
      blockedReason: policyDecision.reason,
    };
  }

  const costEstimate = estimateWorkflowRunCost({
    workflowPlanJson: workflow.planJson,
  });

  const run = await prisma.workflowRun.create({
    data: {
      workflowId: workflow.id,
      userId: params.userId,
      status: resolvedStartDecision.status,
      attemptNumber: nextAttemptNumber,
      triggerSource: params.triggerSource,
      blockedReason: resolvedStartDecision.blockedReason,
      retryHistoryJson: serializeWorkflowRetryHistory([]),
      estimatedTokens: costEstimate.totalEstimate,
    },
  });

  if (params.scheduleId) {
    await updateWorkflowScheduleOnDispatch({
      userId: params.userId,
      scheduleId: params.scheduleId,
      runId: run.id,
      blockedReason:
        resolvedStartDecision.status === 'blocked'
          ? (resolvedStartDecision.blockedReason ?? null)
          : null,
    });
  }

  await prisma.workflow.update({
    where: { id_userId: { id: workflow.id, userId: params.userId } },
    data: { latestRunStatus: run.status },
  });

  return normalizeWorkflowRunDbRecord(run);
}

export async function listWorkflowRuns(userId: string, workflowId: string) {
  const records = await prisma.workflowRun.findMany({
    where: { userId, workflowId },
    orderBy: { createdAt: 'desc' },
  });

  return records.map(record => normalizeWorkflowRunDbRecord(record));
}

export async function getWorkflowRunById(userId: string, runId: string) {
  const record = await prisma.workflowRun.findUnique({
    where: {
      id_userId: {
        id: runId,
        userId,
      },
    },
  });

  return record ? normalizeWorkflowRunDbRecord(record) : null;
}

export async function updateWorkflowRunStatus(params: {
  userId: string;
  runId: string;
  status: WorkflowRunStatus;
  blockedReason?: string | null;
  error?: WorkflowRunError | null;
}) {
  const data: {
    status: WorkflowRunStatus;
    blockedReason?: string | null;
    lastErrorJson?: string | null;
    startedAt?: Date | null;
    finishedAt?: Date | null;
  } = {
    status: params.status,
  };

  if (params.blockedReason !== undefined) {
    data.blockedReason = params.blockedReason;
  }

  if (params.error !== undefined) {
    data.lastErrorJson = serializeWorkflowError(params.error);
  }

  if (params.status === 'running') {
    data.startedAt = new Date();
  }

  if (['failed', 'completed', 'cancelled', 'blocked'].includes(params.status)) {
    data.finishedAt = new Date();
  }

  const isTerminal = ['failed', 'completed', 'cancelled', 'blocked'].includes(params.status);

  const record = await prisma.workflowRun.update({
    where: {
      id_userId: {
        id: params.runId,
        userId: params.userId,
      },
    },
    data,
  });

  await prisma.workflow.update({
    where: {
      id_userId: {
        id: record.workflowId,
        userId: params.userId,
      },
    },
    data: {
      latestRunStatus: record.status,
    },
  });

  await updateWorkflowScheduleOutcomeByRunId({
    userId: params.userId,
    runId: record.id,
    status: params.status,
    message: params.blockedReason ?? params.error?.message ?? null,
  });

  if (isTerminal) {
    try {
      await logWorkflowRunActualCost({ workflowRunId: record.id });
    } catch (error) {
      console.warn('Failed to log workflow run actual cost:', error);
    }
  }

  const updatedRecord = await prisma.workflowRun.findUnique({
    where: { id: record.id },
  });

  return normalizeWorkflowRunDbRecord(updatedRecord!);
}

export async function recordWorkflowRunRetry(params: {
  userId: string;
  runId: string;
  reason: string;
}) {
  const existing = await prisma.workflowRun.findUnique({
    where: {
      id_userId: {
        id: params.runId,
        userId: params.userId,
      },
    },
  });

  if (!existing) {
    throw new Error('WORKFLOW_RUN_NOT_FOUND');
  }

  const retryHistory = normalizeWorkflowRunDbRecord(existing).retryHistory;
  retryHistory.push({
    attempt: retryHistory.length + 1,
    reason: params.reason,
    requestedAt: new Date().toISOString(),
  });

  const record = await prisma.workflowRun.update({
    where: {
      id_userId: {
        id: params.runId,
        userId: params.userId,
      },
    },
    data: {
      retryHistoryJson: serializeWorkflowRetryHistory(retryHistory),
    },
  });

  return normalizeWorkflowRunDbRecord(record);
}

export async function getWorkflowScheduleByWorkflowId(userId: string, workflowId: string) {
  const record = await getWorkflowScheduleRowByWorkflowId(userId, workflowId);
  if (!record) return null;

  const workflow = await prisma.workflow.findUnique({
    where: { id_userId: { id: workflowId, userId } },
  });

  const normalized = normalizeWorkflowScheduleRecord(record);

  if (workflow) {
    normalized.deploymentBundle = buildWorkflowScheduleDeploymentBundle({
      scheduleId: record.id,
      workflowId: record.workflowId,
      title: workflow.title,
      cronExpression: record.cronExpression,
      timezone: record.timezone,
      deploymentState: record.deploymentState as any,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL,
    });
  }

  return normalized;
}

export async function upsertWorkflowSchedule(params: {
  userId: string;
  workflowId: string;
  cronExpression: string;
  timezone?: string;
}) {
  if (!isValidCronExpression(params.cronExpression)) {
    throw new Error('INVALID_CRON_EXPRESSION');
  }

  const workflow = await prisma.workflow.findUnique({
    where: {
      id_userId: {
        id: params.workflowId,
        userId: params.userId,
      },
    },
  });

  if (!workflow) {
    throw new Error('WORKFLOW_NOT_FOUND');
  }

  const existingSchedule = await getWorkflowScheduleRowByWorkflowId(params.userId, workflow.id);
  const normalizedWorkflow = normalizeWorkflowDbRecord({
    ...workflow,
    schedule: existingSchedule,
  });
  const policyDecision = await evaluateAndRecordPolicy({
    subjectType: 'workflow_run',
    actor: { userId: params.userId },
    triggerSource: 'schedule',
    workflowId: workflow.id,
    workflowTitle: normalizedWorkflow.title,
    workflowStatus: normalizedWorkflow.status,
    safety: normalizedWorkflow.safety,
  });

  const target = getWorkflowSchedulerTarget(normalizedWorkflow.plan);
  const activation = getScheduleActivationOutcome({
    workflowStatus: normalizedWorkflow.status,
    plan: normalizedWorkflow.plan,
    safety: normalizedWorkflow.safety,
    policyDecision,
  });
  const scheduleId = existingSchedule?.id ?? `wfs_${workflow.id}`;
  const secretToken = createWorkflowScheduleToken();
  const preview = buildGitHubActionsSchedulePreview({
    scheduleId,
    workflowId: workflow.id,
    title: normalizedWorkflow.title,
    cronExpression: params.cronExpression,
    timezone: params.timezone ?? 'UTC',
  });
  const secretName = preview.secretName;

  const record = await upsertWorkflowScheduleRow({
    id: scheduleId,
    workflowId: workflow.id,
    userId: params.userId,
    status: activation.status,
    cronExpression: params.cronExpression,
    timezone: params.timezone ?? 'UTC',
    schedulerTarget: target,
    deploymentState: activation.deploymentState,
    deploymentReason: activation.reason,
    githubWorkflowName: preview.workflowName,
    githubWorkflowPath: preview.workflowPath,
    githubSecretName: secretName,
    triggerTokenHash: hashWorkflowScheduleToken(secretToken),
    lastError: activation.status === 'blocked' ? activation.reason : null,
  });

  const bundle = buildWorkflowScheduleDeploymentBundle({
    scheduleId,
    workflowId: workflow.id,
    title: normalizedWorkflow.title,
    cronExpression: params.cronExpression,
    timezone: params.timezone ?? 'UTC',
    deploymentState: activation.deploymentState,
    baseUrl: process.env.NEXT_PUBLIC_APP_URL,
  });

  return {
    schedule: normalizeWorkflowScheduleRecord(record),
    preview,
    bundle,
    triggerToken: secretToken,
    policyDecision,
  };
}

export async function pauseWorkflowSchedule(params: { userId: string; workflowId: string }) {
  const record = await getWorkflowScheduleRowByWorkflowId(params.userId, params.workflowId);

  if (!record) {
    throw new Error('WORKFLOW_SCHEDULE_NOT_FOUND');
  }

  const updated = await pauseWorkflowScheduleRow(params.workflowId, params.userId);

  if (!updated) {
    throw new Error('WORKFLOW_SCHEDULE_NOT_FOUND');
  }

  return normalizeWorkflowScheduleRecord(updated);
}

export async function dispatchWorkflowSchedule(params: {
  scheduleId: string;
  workflowId: string;
  token: string;
}) {
  const schedule = await prisma.workflowSchedule.findUnique({
    where: { id: params.scheduleId },
  });

  if (!schedule || schedule.workflowId !== params.workflowId) {
    throw new Error('WORKFLOW_SCHEDULE_NOT_FOUND');
  }

  if (schedule.status !== 'active') {
    throw new Error('WORKFLOW_SCHEDULE_INACTIVE');
  }

  if (hashWorkflowScheduleToken(params.token) !== schedule.triggerTokenHash) {
    throw new Error('WORKFLOW_SCHEDULE_FORBIDDEN');
  }

  const run = await createWorkflowRun({
    userId: schedule.userId,
    workflowId: schedule.workflowId,
    triggerSource: 'schedule',
    scheduleId: schedule.id,
  });

  const updatedSchedule = await getWorkflowScheduleRowById(schedule.userId, schedule.id);

  return {
    schedule: normalizeWorkflowScheduleRecord(updatedSchedule ?? schedule),
    run,
  };
}
