import {
  savedWorkflowSchema,
  workflowPlanSchema,
  workflowRunErrorSchema,
  workflowRunRecordSchema,
  workflowRunRetrySchema,
  workflowScheduleSchema,
  workflowRunStatusSchema,
  workflowSafetyMetadataSchema,
  workflowStoredStatusSchema,
  type WorkflowPlan,
  type WorkflowRunError,
  type WorkflowRunRetry,
  type WorkflowSchedule,
  type WorkflowRunStatus,
  type WorkflowSafetyMetadata,
  type WorkflowStoredStatus,
} from '@/lib/workflows/schema';
import {
  type CryptoDestinationAllowlistEntry,
  type CryptoGuardrailConfig,
} from '@/lib/crypto/schema';
import { evaluatePolicy } from '@/lib/policy/engine';

export type WorkflowTriggerSource = 'manual' | 'api' | 'schedule' | 'event' | 'system';

export interface WorkflowPersistenceRecord {
  id: string;
  userId: string;
  title: string;
  status: string;
  plan: unknown;
  safety: unknown;
  schedule?: WorkflowSchedulePersistenceRecord | null;
  latestRunStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowDbRecord {
  id: string;
  userId: string;
  title: string;
  status: string;
  planJson: string;
  safetyJson: string;
  schedule?: WorkflowScheduleDbRecord | null;
  latestRunStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowRunPersistenceRecord {
  id: string;
  workflowId: string;
  userId: string;
  status: string;
  attemptNumber: number;
  triggerSource: string;
  blockedReason: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  lastError: unknown;
  retryHistory: unknown;
  estimatedTokens: number | null;
  actualTokens: number | null;
  costAttributionMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowRunDbRecord {
  id: string;
  workflowId: string;
  userId: string;
  status: string;
  attemptNumber: number;
  triggerSource: string;
  blockedReason: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  lastErrorJson: string | null;
  retryHistoryJson: string;
  estimatedTokens: number | null;
  actualTokens: number | null;
  costAttributionMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowSchedulePersistenceRecord {
  id: string;
  workflowId: string;
  userId: string;
  status: string;
  cronExpression: string;
  timezone: string;
  schedulerTarget: string;
  deploymentState: string;
  deploymentReason: string | null;
  githubWorkflowName: string | null;
  githubWorkflowPath: string | null;
  githubSecretName: string | null;
  lastTriggeredAt: Date | null;
  lastSuccessfulAt: Date | null;
  lastRunId: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowScheduleDbRecord extends WorkflowSchedulePersistenceRecord {}

const CRYPTO_TOOL_PATTERNS: RegExp[] = [
  /^STRIPE_/i,
  /^COINBASE_/i,
  /^BINANCE_/i,
  /^KRAKEN_/i,
  /^BYBIT_/i,
  /^OKX_/i,
  /^UNISWAP_/i,
  /^JUPITER_/i,
  /^SOLANA_/i,
  /^WALLET_/i,
  /^PAYMENT_/i,
  /^TRADING_/i,
];

const CRYPTO_READ_ONLY_PATTERNS: RegExp[] = [
  /_GET_/i,
  /_FETCH_/i,
  /_LIST_/i,
  /_SEARCH_/i,
  /_FIND_/i,
  /_READ_/i,
  /BALANCE/i,
  /QUOTE/i,
  /PRICE/i,
  /ORDERBOOK/i,
];

function isCryptoTool(toolName: string): boolean {
  return CRYPTO_TOOL_PATTERNS.some(pattern => pattern.test(toolName));
}

function isCryptoWriteTool(toolName: string): boolean {
  if (!isCryptoTool(toolName)) return false;
  const isReadOnly = CRYPTO_READ_ONLY_PATTERNS.some(pattern => pattern.test(toolName));
  return !isReadOnly;
}

export function deriveWorkflowSafety(plan: WorkflowPlan): WorkflowSafetyMetadata {
  const hasFinancialStep = plan.steps.some(step => step.kind === 'financial');
  const hasCryptoWriteTool = plan.steps.some(step =>
    step.toolHints.some(tool => isCryptoWriteTool(tool))
  );

  const containsFinancialSteps = hasFinancialStep || hasCryptoWriteTool;

  const scopes = plan.steps.flatMap(step => {
    const isFinancial =
      step.kind === 'financial' || step.toolHints.some(tool => isCryptoWriteTool(tool));
    const mode: 'read' | 'write' = isFinancial || step.requiresApproval ? 'write' : 'read';

    if (step.toolHints.length === 0) {
      return [
        {
          tool: 'unassigned',
          mode,
          resources: [],
          reason: `Workflow step ${step.id} requires explicit scope assignment before execution.`,
        },
      ];
    }

    return step.toolHints.map(tool => ({
      tool,
      mode,
      resources: [],
      reason: `Workflow step ${step.id} may use ${tool} for ${step.description}`,
    }));
  });

  const riskLevel = containsFinancialSteps
    ? 'high'
    : plan.guardrails.requiresExplicitApproval || plan.steps.some(step => step.requiresApproval)
      ? 'medium'
      : 'low';

  return {
    containsFinancialSteps,
    requiresApproval: plan.guardrails.requiresExplicitApproval,
    requiresTransactionCaps: plan.guardrails.requiresTransactionCaps,
    requiresAuditLog: plan.guardrails.requiresAuditLog,
    simulateOnlyByDefault: plan.guardrails.simulateOnlyByDefault,
    riskLevel,
    approvalState:
      containsFinancialSteps || plan.readiness === 'needs_policy_confirmation'
        ? 'required'
        : 'not_required',
    explicitScopesRequired: plan.guardrails.requiresExplicitScopes,
    scopes,
    schedulePreference: plan.guardrails.schedulingPreference,
  };
}

export function determineRunnableStatus(
  plan: WorkflowPlan,
  safety: WorkflowSafetyMetadata
): WorkflowStoredStatus {
  if (safety.containsFinancialSteps || safety.approvalState === 'required') {
    return 'draft';
  }

  if (plan.openQuestions.length > 0) {
    return 'draft';
  }

  return 'ready';
}

export function serializeWorkflowPlan(plan: WorkflowPlan): string {
  return JSON.stringify(workflowPlanSchema.parse(plan));
}

export function deserializeWorkflowPlan(value: string): WorkflowPlan {
  return workflowPlanSchema.parse(JSON.parse(value));
}

export function serializeWorkflowSafety(safety: WorkflowSafetyMetadata): string {
  return JSON.stringify(workflowSafetyMetadataSchema.parse(safety));
}

export function deserializeWorkflowSafety(value: string): WorkflowSafetyMetadata {
  return workflowSafetyMetadataSchema.parse(JSON.parse(value));
}

export function serializeWorkflowError(error: WorkflowRunError | null): string | null {
  return error ? JSON.stringify(workflowRunErrorSchema.parse(error)) : null;
}

export function deserializeWorkflowError(value: string | null): WorkflowRunError | null {
  if (!value) return null;
  return workflowRunErrorSchema.parse(JSON.parse(value));
}

export function serializeWorkflowRetryHistory(retries: WorkflowRunRetry[]): string {
  return JSON.stringify(retries.map(entry => workflowRunRetrySchema.parse(entry)));
}

export function deserializeWorkflowRetryHistory(value: string | null): WorkflowRunRetry[] {
  if (!value) return [];
  return workflowRunRetrySchema.array().parse(JSON.parse(value));
}

export function canStartWorkflowRun(input: {
  workflowStatus: WorkflowStoredStatus;
  safety: WorkflowSafetyMetadata;
}): {
  allowed: boolean;
  status: WorkflowRunStatus;
  blockedReason: string | null;
} {
  if (input.workflowStatus === 'archived') {
    return {
      allowed: false,
      status: 'blocked',
      blockedReason: 'Archived workflows cannot be started.',
    };
  }

  if (input.safety.approvalState === 'required') {
    return {
      allowed: false,
      status: 'blocked',
      blockedReason: 'Workflow requires explicit approval before a run can proceed.',
    };
  }

  if (input.workflowStatus !== 'ready') {
    return {
      allowed: false,
      status: 'blocked',
      blockedReason: 'Workflow draft is not runnable yet.',
    };
  }

  return {
    allowed: true,
    status: 'pending',
    blockedReason: null,
  };
}

export function evaluateWorkflowRunPolicy(input: {
  userId: string;
  workflowId: string;
  workflowTitle: string;
  workflowStatus: WorkflowStoredStatus;
  triggerSource: WorkflowTriggerSource;
  safety: WorkflowSafetyMetadata;
  crypto?: {
    config: CryptoGuardrailConfig | null;
    destinations: CryptoDestinationAllowlistEntry[];
  };
}) {
  return evaluatePolicy({
    subjectType: 'workflow_run',
    actor: { userId: input.userId },
    triggerSource: input.triggerSource,
    workflowId: input.workflowId,
    workflowTitle: input.workflowTitle,
    workflowStatus: input.workflowStatus,
    safety: input.safety,
    crypto: input.crypto,
  });
}

export function normalizeWorkflowRecord(record: WorkflowPersistenceRecord) {
  return savedWorkflowSchema.parse({
    id: record.id,
    userId: record.userId,
    title: record.title,
    status: workflowStoredStatusSchema.parse(record.status),
    plan:
      typeof record.plan === 'string'
        ? deserializeWorkflowPlan(record.plan)
        : workflowPlanSchema.parse(record.plan),
    safety:
      typeof record.safety === 'string'
        ? deserializeWorkflowSafety(record.safety)
        : workflowSafetyMetadataSchema.parse(record.safety),
    schedule: record.schedule ? normalizeWorkflowScheduleRecord(record.schedule) : null,
    latestRunStatus: record.latestRunStatus
      ? workflowRunStatusSchema.parse(record.latestRunStatus)
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

export function normalizeWorkflowDbRecord(record: WorkflowDbRecord) {
  return normalizeWorkflowRecord({
    id: record.id,
    userId: record.userId,
    title: record.title,
    status: record.status,
    plan: record.planJson,
    safety: record.safetyJson,
    schedule: record.schedule ?? null,
    latestRunStatus: record.latestRunStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function normalizeWorkflowRunRecord(record: WorkflowRunPersistenceRecord) {
  return workflowRunRecordSchema.parse({
    id: record.id,
    workflowId: record.workflowId,
    userId: record.userId,
    status: workflowRunStatusSchema.parse(record.status),
    attemptNumber: record.attemptNumber,
    triggerSource: record.triggerSource,
    blockedReason: record.blockedReason,
    startedAt: record.startedAt?.toISOString() ?? null,
    finishedAt: record.finishedAt?.toISOString() ?? null,
    lastError:
      typeof record.lastError === 'string'
        ? deserializeWorkflowError(record.lastError)
        : workflowRunErrorSchema.nullable().parse(record.lastError ?? null),
    retryHistory:
      typeof record.retryHistory === 'string'
        ? deserializeWorkflowRetryHistory(record.retryHistory)
        : workflowRunRetrySchema.array().parse(record.retryHistory ?? []),
    estimatedTokens: record.estimatedTokens,
    actualTokens: record.actualTokens,
    costAttributionMethod: record.costAttributionMethod as any,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

export function normalizeWorkflowRunDbRecord(record: WorkflowRunDbRecord) {
  return normalizeWorkflowRunRecord({
    id: record.id,
    workflowId: record.workflowId,
    userId: record.userId,
    status: record.status,
    attemptNumber: record.attemptNumber,
    triggerSource: record.triggerSource,
    blockedReason: record.blockedReason,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    lastError: record.lastErrorJson,
    retryHistory: record.retryHistoryJson,
    estimatedTokens: record.estimatedTokens,
    actualTokens: record.actualTokens,
    costAttributionMethod: record.costAttributionMethod,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function normalizeWorkflowScheduleRecord(record: WorkflowSchedulePersistenceRecord) {
  return workflowScheduleSchema.parse({
    id: record.id,
    workflowId: record.workflowId,
    userId: record.userId,
    status: record.status,
    cronExpression: record.cronExpression,
    timezone: record.timezone,
    schedulerTarget: record.schedulerTarget,
    deploymentState: record.deploymentState,
    deploymentReason: record.deploymentReason,
    githubWorkflowName: record.githubWorkflowName,
    githubWorkflowPath: record.githubWorkflowPath,
    githubSecretName: record.githubSecretName,
    lastTriggeredAt: record.lastTriggeredAt?.toISOString() ?? null,
    lastSuccessfulAt: record.lastSuccessfulAt?.toISOString() ?? null,
    lastRunId: record.lastRunId,
    lastError: record.lastError,
    consecutiveFailures: record.consecutiveFailures,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}
