import test from "node:test";
import assert from "node:assert/strict";
import { compileWorkflowPlan } from "@/lib/workflows/compiler";
import {
  buildGitHubActionsSchedulePreview,
  buildWorkflowScheduleSecretName,
  getScheduleActivationOutcome,
  getWorkflowSchedulerTarget,
  hashWorkflowScheduleToken,
  isValidCronExpression,
} from "@/lib/workflows/scheduling";

test("validates basic cron expressions conservatively", () => {
  assert.equal(isValidCronExpression("0 * * * *"), true);
  assert.equal(isValidCronExpression("0 * * *"), false);
});

test("prefers github actions for scheduled workflow plans", () => {
  const plan = compileWorkflowPlan("Monitor GitHub issues every hour and alert me in Slack");
  assert.equal(getWorkflowSchedulerTarget(plan), "github_actions");
});

test("blocks schedule activation when policy does not allow scheduled runs", () => {
  const plan = compileWorkflowPlan("Buy SOL every day and notify me");
  const safety = {
    containsFinancialSteps: true,
    requiresApproval: true,
    requiresTransactionCaps: true,
    requiresAuditLog: true,
    simulateOnlyByDefault: true,
    riskLevel: "high" as const,
    approvalState: "required" as const,
    explicitScopesRequired: true,
    scopes: [{ tool: "unassigned", mode: "write" as const, resources: [], reason: "financial" }],
    schedulePreference: "manual_only" as const,
  };

  const outcome = getScheduleActivationOutcome({
    workflowStatus: "draft",
    plan,
    safety,
    policyDecision: {
      subjectType: "workflow_run",
      actionType: "financial",
      riskLevel: "critical",
      scopes: [],
      decision: "deny",
      reason: "Scheduled crypto actions remain blocked.",
      requiresApproval: true,
      simulateOnly: false,
      auditRequired: true,
      approvalRequestRequired: false,
      metadata: {},
      crypto: null,
    },
  });

  assert.equal(outcome.status, "blocked");
  assert.match(outcome.reason ?? "", /ready|blocked|manual/i);
});

test("builds a github actions preview with per-schedule secret metadata", () => {
  const preview = buildGitHubActionsSchedulePreview({
    scheduleId: "sched_123",
    workflowId: "wf_123",
    title: "Issue Monitor",
    cronExpression: "0 * * * *",
    timezone: "UTC",
  });

  assert.equal(preview.secretName, buildWorkflowScheduleSecretName("sched_123"));
  assert.match(preview.yaml, /X-Workflow-Schedule-Token/);
  assert.match(preview.workflowPath, /scheduled-workflow-wf_123\.yml/);
});

test("hashes schedule tokens deterministically", () => {
  assert.equal(hashWorkflowScheduleToken("abc"), hashWorkflowScheduleToken("abc"));
});
