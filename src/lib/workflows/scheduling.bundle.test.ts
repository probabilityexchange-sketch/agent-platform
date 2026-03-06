import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkflowScheduleDeploymentBundle } from "@/lib/workflows/scheduling";

test("builds a complete deployment bundle for github actions", () => {
  const bundle = buildWorkflowScheduleDeploymentBundle({
    scheduleId: "sched_123",
    workflowId: "wf_123",
    title: "Test Workflow",
    cronExpression: "0 * * * *",
    timezone: "UTC",
    deploymentState: "pending_manual_sync",
    baseUrl: "https://api.test.com",
  });

  assert.equal(bundle.scheduleId, "sched_123");
  assert.equal(bundle.workflowId, "wf_123");
  assert.equal(bundle.title, "Test Workflow");
  assert.equal(bundle.filename, "scheduled-workflow-wf_123.yml");
  assert.match(bundle.content, /X-Workflow-Schedule-Token/);
  assert.match(bundle.content, /https:\/\/api\.test\.com/);
  
  // Secrets
  const secretNames = bundle.secrets.map(s => s.name);
  assert.ok(secretNames.includes("WORKFLOW_SCHEDULE_TOKEN_SCHED_123"));
  assert.ok(secretNames.includes("APP_BASE_URL"));
  
  // Instructions
  assert.ok(bundle.instructions.length >= 5);
  assert.ok(bundle.instructions.some(i => i.includes(".github/workflows/scheduled-workflow-wf_123.yml")));
});

test("adds resync notice to instructions when state is needs_resync", () => {
  const bundle = buildWorkflowScheduleDeploymentBundle({
    scheduleId: "sched_123",
    workflowId: "wf_123",
    title: "Test Workflow",
    cronExpression: "0 * * * *",
    timezone: "UTC",
    deploymentState: "needs_resync",
  });

  assert.equal(bundle.syncStatus, "needs_resync");
  assert.ok(bundle.instructions.some(i => i.includes("NOTE: This workflow has changed")));
});

test("builds bundle for blocked state", () => {
  const bundle = buildWorkflowScheduleDeploymentBundle({
    scheduleId: "sched_123",
    workflowId: "wf_123",
    title: "Test Workflow",
    cronExpression: "0 * * * *",
    timezone: "UTC",
    deploymentState: "blocked",
  });

  assert.equal(bundle.syncStatus, "blocked");
  assert.ok(bundle.instructions.length >= 5);
});
