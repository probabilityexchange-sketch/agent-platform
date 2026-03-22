import { prisma } from '@/lib/db/prisma';
import { getCallCost, AGENT_PRICING, type AgentTier } from '@/lib/tokenomics';

export interface StepCost {
  stepId: string;
  description: string;
  estimatedTokens: number;
  model?: string;
  note?: string;
}

export interface WorkflowCostEstimate {
  totalEstimate: number;
  breakdown: StepCost[];
  isMinimum: boolean;
  disclaimer: string;
}

const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

export function getDefaultModelCost() {
  return getCallCost(DEFAULT_MODEL).finalCost;
}

export function getModelCost(model: string) {
  return getCallCost(model).finalCost;
}

function getTierFromModel(model: string): AgentTier {
  if (model.includes(':free')) return 'STANDARD';
  if (model.includes('gpt-4o') || model.includes('claude-3-sonnet')) return 'PREMIUM';
  if (model.includes('o1') || model.includes('claude-3-opus')) return 'ULTRA';
  return 'STANDARD';
}

export function estimateWorkflowCost(params: {
  steps: Array<{
    id: string;
    description: string;
    kind: string;
    toolHints?: string[];
  }>;
  model?: string;
}): WorkflowCostEstimate {
  const model = params.model ?? DEFAULT_MODEL;
  const baseCallCost = getModelCost(model);

  const breakdown: StepCost[] = params.steps.map(step => {
    let estimatedTokens = baseCallCost;
    let note: string | undefined;

    if (step.kind === 'research') {
      estimatedTokens = getModelCost('gpt-4o');
      note = 'Using PREMIUM for research (deep analysis)';
    } else if (step.kind === 'action' || step.kind === 'financial') {
      estimatedTokens = baseCallCost;
      note = 'Base action cost';
    } else if (step.kind === 'decision') {
      estimatedTokens = baseCallCost;
      note = 'Decision step cost';
    } else if (step.kind === 'notify' || step.kind === 'report') {
      estimatedTokens = getCallCost('llama-3.3-70b-instruct:free').finalCost;
      note = 'Using STANDARD for notification (lightweight)';
    } else if (step.kind === 'monitor') {
      estimatedTokens = getCallCost('gpt-4o').finalCost;
      note = 'Using PREMIUM for monitoring (ongoing checks)';
    }

    if (step.toolHints && step.toolHints.length > 0) {
      note = note ? `${note}; tool costs NOT YET PRICED` : 'Tool costs NOT YET PRICED';
    }

    return {
      stepId: step.id,
      description: step.description,
      estimatedTokens,
      model: getTierFromModel(
        estimatedTokens === getCallCost('gpt-4o').finalCost
          ? 'gpt-4o'
          : estimatedTokens === getCallCost('llama-3.3-70b-instruct:free').finalCost
            ? 'llama-3.3-70b-instruct:free'
            : model
      ),
      note,
    };
  });

  const totalEstimate = breakdown.reduce((sum, step) => sum + step.estimatedTokens, 0);

  const hasExternalTools = params.steps.some(step => step.toolHints && step.toolHints.length > 0);

  return {
    totalEstimate,
    breakdown,
    isMinimum: hasExternalTools,
    disclaimer: hasExternalTools
      ? 'This is a minimum/conservative estimate. External tool execution costs are not yet included and may significantly increase actual cost.'
      : 'This is a minimum/conservative estimate based on known model costs only.',
  };
}

export function estimateWorkflowRunCost(params: {
  workflowPlanJson: string;
}): WorkflowCostEstimate {
  try {
    const plan = JSON.parse(params.workflowPlanJson);
    return estimateWorkflowCost({
      steps: plan.steps || [],
      model: plan.metadata?.defaultModel,
    });
  } catch {
    const fallbackCost = getDefaultModelCost();
    return {
      totalEstimate: fallbackCost,
      breakdown: [
        {
          stepId: 'unknown',
          description: 'Unable to parse workflow plan',
          estimatedTokens: fallbackCost,
          note: 'Fallback estimate using STANDARD tier',
        },
      ],
      isMinimum: true,
      disclaimer: 'Could not parse workflow plan. This is a fallback minimum estimate.',
    };
  }
}

export async function logWorkflowRunActualCost(params: { workflowRunId: string }): Promise<number> {
  const workflowRun = await prisma.workflowRun.findUnique({
    where: { id: params.workflowRunId },
    select: {
      startedAt: true,
      finishedAt: true,
      userId: true,
    },
  });

  if (!workflowRun || !workflowRun.startedAt || !workflowRun.finishedAt) {
    return 0;
  }

  const transactions = await prisma.tokenTransaction.findMany({
    where: {
      userId: workflowRun.userId,
      type: 'USAGE',
      createdAt: {
        gte: workflowRun.startedAt,
        lte: workflowRun.finishedAt,
      },
    },
    select: {
      amount: true,
    },
  });

  const totalActual = Math.abs(transactions.reduce((sum, tx) => sum + tx.amount, 0));

  await prisma.workflowRun.update({
    where: { id: params.workflowRunId },
    data: {
      actualTokens: totalActual,
      costAttributionMethod: 'time_window_attributed',
    },
  });

  return totalActual;
}
