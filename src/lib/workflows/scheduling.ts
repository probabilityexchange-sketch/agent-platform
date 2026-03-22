import { createHash, randomBytes } from 'node:crypto';
import {
  workflowSchedulePreviewSchema,
  type WorkflowPlan,
  type WorkflowSafetyMetadata,
  type WorkflowSchedulePreview,
  type WorkflowSchedulerTarget,
  type WorkflowStoredStatus,
  type WorkflowScheduleDeploymentBundle,
  type WorkflowScheduleDeploymentState,
} from '@/lib/workflows/schema';
import { type PolicyDecision } from '@/lib/policy/schema';

const CRON_PARTS = 5;

export function isValidCronExpression(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const parts = trimmed.split(/\s+/);
  return parts.length === CRON_PARTS && parts.every(part => part.length > 0);
}

export function getWorkflowSchedulerTarget(plan: WorkflowPlan): WorkflowSchedulerTarget {
  if (plan.guardrails.schedulingPreference === 'manual_only') return 'manual_only';
  if (plan.trigger.preferredRunner === 'interactive_runtime') return 'interactive_runtime';
  return 'github_actions';
}

export function getScheduleActivationOutcome(input: {
  workflowStatus: WorkflowStoredStatus;
  plan: WorkflowPlan;
  safety: WorkflowSafetyMetadata;
  policyDecision: PolicyDecision;
}): {
  status: 'active' | 'blocked';
  deploymentState: WorkflowScheduleDeploymentState;
  reason: string | null;
} {
  const target = getWorkflowSchedulerTarget(input.plan);

  if (target !== 'github_actions') {
    return {
      status: 'blocked',
      deploymentState: 'blocked',
      reason:
        'This workflow is not a good GitHub Actions scheduling candidate and should stay manual or interactive.',
    };
  }

  if (input.workflowStatus !== 'ready') {
    return {
      status: 'blocked',
      deploymentState: 'blocked',
      reason: 'Only ready workflows can be scheduled.',
    };
  }

  if (input.policyDecision.decision !== 'allow') {
    return {
      status: 'blocked',
      deploymentState: 'blocked',
      reason: input.policyDecision.reason,
    };
  }

  return {
    status: 'active',
    deploymentState: 'pending_manual_sync',
    reason: 'GitHub Actions schedule is ready for manual sync.',
  };
}

export function buildWorkflowScheduleSecretName(scheduleId: string): string {
  return `WORKFLOW_SCHEDULE_TOKEN_${scheduleId.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
}

export function createWorkflowScheduleToken(): string {
  return randomBytes(24).toString('hex');
}

export function hashWorkflowScheduleToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function buildGitHubActionsSchedulePreview(input: {
  baseUrlPlaceholder?: string;
  scheduleId: string;
  workflowId: string;
  title: string;
  cronExpression: string;
  timezone: string;
}): WorkflowSchedulePreview {
  const workflowName = `Scheduled Workflow: ${input.title}`;
  const filename = `scheduled-workflow-${input.workflowId}.yml`;
  const workflowPath = `.github/workflows/${filename}`;
  const secretName = buildWorkflowScheduleSecretName(input.scheduleId);
  const dispatchPath = `/api/workflows/schedules/${input.scheduleId}/dispatch`;
  const baseUrl = input.baseUrlPlaceholder ?? '${{ secrets.APP_BASE_URL }}';

  const yaml = [
    `name: "${workflowName}"`,
    '',
    'on:',
    '  schedule:',
    `    - cron: "${input.cronExpression}"`,
    '  workflow_dispatch:',
    '    inputs:',
    '      reason:',
    '        description: "Reason for manual trigger"',
    '        required: false',
    '        default: "Manual trigger from GitHub UI"',
    '',
    'jobs:',
    '  run-scheduled-workflow:',
    '    name: Execute Workflow',
    '    runs-on: ubuntu-latest',
    '    timeout-minutes: 5',
    '    env:',
    `      TZ: "${input.timezone}"`,
    '    steps:',
    '      - name: Trigger Platform API',
    '        id: trigger',
    '        run: |',
    '          echo "Triggering workflow ${input.workflowId} via schedule ${input.scheduleId}"',
    '          RESPONSE=$(curl -s -X POST \\',
    `            -w \"\\n%{http_code}\" \\`,
    `            -H \"Content-Type: application/json\" \\`,
    `            -H \"X-Workflow-Schedule-Token: \${{ secrets.${secretName} }}\" \\`,
    `            -d '{\"workflowId\":\"${input.workflowId}\"}' \\`,
    `            \"${baseUrl}${dispatchPath}\")`,
    '',
    '          HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)',
    '          BODY=$(echo "$RESPONSE" | head -n -1)',
    '',
    '          if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then',
    '            echo "::error::API Trigger failed with status $HTTP_CODE"',
    '            echo "Response: $BODY"',
    '            exit 1',
    '          fi',
    '',
    '          echo "Successfully triggered workflow run."',
    '          echo "Response: $BODY"',
  ].join('\n');

  return workflowSchedulePreviewSchema.parse({
    schedulerTarget: 'github_actions',
    workflowName,
    workflowPath,
    secretName,
    dispatchPath,
    cronExpression: input.cronExpression,
    timezone: input.timezone,
    yaml,
  });
}

export function buildWorkflowScheduleDeploymentBundle(input: {
  scheduleId: string;
  workflowId: string;
  title: string;
  cronExpression: string;
  timezone: string;
  deploymentState: WorkflowScheduleDeploymentState;
  baseUrl?: string;
}): WorkflowScheduleDeploymentBundle {
  const preview = buildGitHubActionsSchedulePreview({
    scheduleId: input.scheduleId,
    workflowId: input.workflowId,
    title: input.title,
    cronExpression: input.cronExpression,
    timezone: input.timezone,
    baseUrlPlaceholder: input.baseUrl,
  });

  const filename = preview.workflowPath.split('/').pop() || 'workflow.yml';
  const dispatchUrl = `${input.baseUrl ?? 'https://your-platform-domain.com'}${preview.dispatchPath}`;

  const instructions = [
    `1. Create a new file in your GitHub repository at: ${preview.workflowPath}`,
    '2. Copy and paste the provided YAML content into that file.',
    `3. Add a Repository Secret named "${preview.secretName}" with the provided trigger token.`,
    '4. Add a Repository Secret named "APP_BASE_URL" with the base URL of this platform (e.g., https://app.example.com).',
    '5. Commit and push the changes to your main branch.',
  ];

  if (input.deploymentState === 'needs_resync') {
    instructions.unshift(
      'NOTE: This workflow has changed. You must update the YAML file in your repository to ensure it matches the latest definition.'
    );
  }

  return {
    scheduleId: input.scheduleId,
    workflowId: input.workflowId,
    title: input.title,
    filename,
    filePath: preview.workflowPath,
    content: preview.yaml,
    secrets: [
      {
        name: preview.secretName,
        description: 'Unique token for this specific schedule. DO NOT share this.',
        required: true,
      },
      {
        name: 'APP_BASE_URL',
        description: 'The base URL of the agent platform API.',
        required: true,
        valueHint: 'https://your-app-domain.com',
      },
    ],
    envVars: {
      TZ: input.timezone,
    },
    dispatchUrl,
    syncStatus: input.deploymentState,
    instructions,
  };
}
