# Workflow / Approval / Guardrail / Schedule Contract

## 1. Current Backend Entities

This document describes implemented backend state and API behavior as of the current repo state. It does not describe intended product behavior unless that behavior is already machine-readable in code.

### Workflow

- Source schema: `src/lib/workflows/schema.ts`
- Persistence/services: `src/lib/workflows/persistence.ts`, `src/lib/workflows/service.ts`
- API surfaces:
  - `src/app/api/workflows/route.ts`
  - `src/app/api/workflows/[workflowId]/route.ts`
  - `src/app/api/workflows/[workflowId]/runs/route.ts`
  - `src/app/api/chat/route.ts`

Machine-readable workflow fields relevant to UX:

- `status`: `draft | ready | archived`
- `plan.readiness`: `draft_only | needs_policy_confirmation`
- `plan.openQuestions[]`
- `safety.containsFinancialSteps`
- `safety.requiresApproval`
- `safety.requiresTransactionCaps`
- `safety.requiresAuditLog`
- `safety.simulateOnlyByDefault`
- `safety.riskLevel`: `low | medium | high`
- `safety.approvalState`: `not_required | required | approved | rejected`
- `safety.explicitScopesRequired`
- `safety.scopes[]`
- `safety.schedulePreference`
- `latestRunStatus`
- optional embedded `schedule`

### Workflow Run

- Source schema: `src/lib/workflows/schema.ts`
- Persistence/services: `src/lib/workflows/persistence.ts`, `src/lib/workflows/service.ts`
- API surfaces:
  - `src/app/api/workflows/[workflowId]/runs/route.ts`
  - `src/lib/workflows/service.ts#createWorkflowRun`

Machine-readable run fields relevant to UX:

- `status`: `pending | ready | blocked | running | failed | completed | cancelled`
- `attemptNumber`
- `triggerSource`: `manual | api | schedule | event | system`
- `blockedReason`
- `startedAt`
- `finishedAt`
- `lastError`
- `retryHistory[]`

Important implemented note:

- New runs are created as `pending` or `blocked` from current service logic.
- `ready` exists in the schema but is not currently produced by `createWorkflowRun`.

### Approval Request

- Prisma model: `ApprovalRequest` in `prisma/schema.prisma`
- API surface: `src/app/api/chat/approve/route.ts`
- Created indirectly by policy/service flow in `src/lib/policy/service.ts`

Machine-readable approval request fields relevant to UX:

- `id`
- `userId`
- `sessionId?`
- `workflowId?`
- `toolCallId?`
- `toolName?`
- `toolArgsJson?`
- `summary`
- `status` (implemented values in current flow: `pending | approved | rejected`)
- `decisionType`
- `reason`
- `scopesJson`
- `pendingMessages?`
- `metadataJson`
- `resolvedAt?`
- `createdAt`
- `updatedAt`

Important implemented note:

- The API still supports legacy `ToolApproval` records in parallel with `ApprovalRequest`.
- UX must not assume there is only one approval entity type in the system yet.

### Policy Decision

- Source schema: `src/lib/policy/schema.ts`
- Decision engine: `src/lib/policy/engine.ts`
- Persistence model: `PolicyDecision` in `prisma/schema.prisma`

Machine-readable fields relevant to UX:

- `subjectType`: `tool_call | workflow_run`
- `actionType`: `read | write | dangerous | financial | payment | trading | workflow_execute`
- `riskLevel`: `low | medium | high | critical`
- `decision`: `allow | approve | deny | simulate`
- `reason`
- `requiresApproval`
- `simulateOnly`
- `auditRequired`
- `approvalRequestRequired`
- optional `crypto`

### Crypto Guardrail Decision

- Source schema: `src/lib/crypto/schema.ts`
- Evaluation logic: `src/lib/crypto/guardrails.ts`
- Audit persistence: `CryptoAuditLog` via `src/lib/crypto/service.ts`

Machine-readable fields relevant to UX:

- `cryptoActionType`: `none | wallet_read | wallet_transfer | wallet_write | payment | trading | swap | approval | unknown`
- `isCryptoRelated`
- `riskLevel`: `low | medium | high | critical`
- `asset`
- `amount`
- `estimatedUsdCents`
- `destination`
- `decision`: `allow | approve | deny | simulate`
- `reason`
- `requiresApproval`
- `simulateOnly`
- `capStatus`: `not_applicable | within_cap | over_cap | missing_amount | missing_config`
- `allowlistStatus`: `not_applicable | allowlisted | not_allowlisted | missing_destination`
- `configPresent`

### Workflow Schedule

- Source schema: `src/lib/workflows/schema.ts`
- Scheduling logic: `src/lib/workflows/scheduling.ts`
- Persistence/services: `src/lib/workflows/service.ts`
- API surfaces:
  - `src/app/api/workflows/[workflowId]/schedule/route.ts`
  - `src/app/api/workflows/schedules/[scheduleId]/dispatch/route.ts`

Machine-readable schedule fields relevant to UX:

- `status`: `draft | active | paused | blocked`
- `cronExpression`
- `timezone`
- `schedulerTarget`: `github_actions | interactive_runtime | manual_only`
- `deploymentState`: `pending_manual_sync | synced | needs_resync | blocked`
- `deploymentReason`
- `githubWorkflowName`
- `githubWorkflowPath`
- `githubSecretName`
- `lastTriggeredAt`
- `lastSuccessfulAt`
- `lastRunId`
- `lastError`
- `consecutiveFailures`
- optional `deploymentBundle`

## 2. State Inventory

### Workflow states

| Entity   | State      | How it is set                                                                                    | Meaning in backend                |
| -------- | ---------- | ------------------------------------------------------------------------------------------------ | --------------------------------- |
| Workflow | `draft`    | `determineRunnableStatus()` when financial, approval-required, or open-question conditions exist | Saved but not runnable            |
| Workflow | `ready`    | `determineRunnableStatus()` when no blocking draft conditions remain                             | Runnable from backend perspective |
| Workflow | `archived` | Schema supports it; current save/list flows do not expose an archive API here                    | Non-runnable archived record      |

Important implementation detail:

- A workflow can remain `draft` even after being saved successfully.
- In current code, financial/crypto-sensitive workflows are intentionally pushed toward `draft` via safety derivation.

### Workflow run states

| Entity      | State       | How it is set                                                                                           | Meaning in backend                                      |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| WorkflowRun | `pending`   | `createWorkflowRun()` when policy and run checks allow creation                                         | Run record created and eligible for later execution     |
| WorkflowRun | `blocked`   | `createWorkflowRun()` when policy says `approve`, `simulate`, or `deny`, or when run preconditions fail | Run cannot proceed                                      |
| WorkflowRun | `running`   | `updateWorkflowRunStatus()`                                                                             | Execution started                                       |
| WorkflowRun | `failed`    | `updateWorkflowRunStatus()`                                                                             | Execution failed                                        |
| WorkflowRun | `completed` | `updateWorkflowRunStatus()`                                                                             | Execution completed successfully                        |
| WorkflowRun | `cancelled` | `updateWorkflowRunStatus()`                                                                             | Execution cancelled                                     |
| WorkflowRun | `ready`     | Schema-only in current observed flow                                                                    | Exists in schema, not currently emitted by run creation |

### Approval request states

| Entity          | State      | How it is set                                                      | Meaning in backend                                                  |
| --------------- | ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| ApprovalRequest | `pending`  | Created by policy/service when approval is needed                  | Waiting on user decision                                            |
| ApprovalRequest | `approved` | `src/app/api/chat/approve/route.ts` via `resolveApprovalRequest()` | Approved record only; follow-up execution semantics remain separate |
| ApprovalRequest | `rejected` | `src/app/api/chat/approve/route.ts` via `resolveApprovalRequest()` | Explicit rejection                                                  |

Important implementation detail:

- Legacy `ToolApproval` uses uppercase statuses like `PENDING`, `APPROVED`, `REJECTED`.
- New `ApprovalRequest` uses lowercase `pending`, `approved`, `rejected`.
- UX should normalize these before display.

### Policy decision states

| Entity         | State      | Meaning in backend                                                         |
| -------------- | ---------- | -------------------------------------------------------------------------- |
| PolicyDecision | `allow`    | Action may proceed automatically                                           |
| PolicyDecision | `approve`  | Action requires explicit approval before execution                         |
| PolicyDecision | `deny`     | Action is blocked                                                          |
| PolicyDecision | `simulate` | Action is intentionally not live-executable; show as dry-run/simulate-only |

### Crypto guardrail states

| Dimension        | State                 | Meaning in backend                                                        |
| ---------------- | --------------------- | ------------------------------------------------------------------------- |
| Crypto decision  | `allow`               | Non-crypto or read-only crypto action may proceed                         |
| Crypto decision  | `approve`             | Crypto action still requires explicit approval; auto-execution is blocked |
| Crypto decision  | `deny`                | Crypto action is blocked                                                  |
| Crypto decision  | `simulate`            | Crypto action remains simulate-only                                       |
| Cap status       | `not_applicable`      | No cap evaluation needed                                                  |
| Cap status       | `within_cap`          | Per-transaction cap check passed                                          |
| Cap status       | `over_cap`            | Hard cap exceeded                                                         |
| Cap status       | `missing_amount`      | Amount too unclear to enforce safely                                      |
| Cap status       | `missing_config`      | No crypto config available                                                |
| Allowlist status | `not_applicable`      | No allowlist check needed                                                 |
| Allowlist status | `allowlisted`         | Destination passed allowlist check                                        |
| Allowlist status | `not_allowlisted`     | Destination not on allowlist                                              |
| Allowlist status | `missing_destination` | Destination too unclear to evaluate safely                                |

Important implementation detail:

- A crypto action being `within_cap` and `allowlisted` does not mean it is approved to execute live.
- Current guardrail logic still returns `approve` in that case for write-like crypto actions.

### Schedule states

| Entity           | State     | How it is set                                                                                                     | Meaning in backend                         |
| ---------------- | --------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| WorkflowSchedule | `active`  | `getScheduleActivationOutcome()` when workflow is ready, target is GitHub Actions, and policy decision is `allow` | Schedule is considered active in app state |
| WorkflowSchedule | `blocked` | `getScheduleActivationOutcome()` or workflow-change invalidation                                                  | Schedule may not dispatch recurring runs   |
| WorkflowSchedule | `paused`  | `pauseWorkflowSchedule()`                                                                                         | User paused schedule                       |
| WorkflowSchedule | `draft`   | Schema supports it; current upsert path typically creates `active` or `blocked`                                   | Schedule exists but not yet activated      |

### Schedule deployment states

| Entity                           | State                 | How it is set                                                       | Meaning in backend                                                                    |
| -------------------------------- | --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| WorkflowSchedule.deploymentState | `pending_manual_sync` | New active schedule or paused schedule                              | Backend has generated GitHub Actions bundle, but repo sync is manual and not verified |
| WorkflowSchedule.deploymentState | `synced`              | Schema supports it; current service code shown here does not set it | Intended synced state, but not currently proven by this code path                     |
| WorkflowSchedule.deploymentState | `needs_resync`        | Workflow changes after schedule exists                              | User must re-sync GitHub Actions workflow file and secrets                            |
| WorkflowSchedule.deploymentState | `blocked`             | Activation is blocked                                               | Schedule cannot be activated safely                                                   |

## 3. User-Facing Meaning Per State

This section describes accurate UX meaning based on current code. It is not a recommendation to expose every state directly.

### Workflow

- `draft`
  - Accurate user meaning: "Saved, but not runnable yet. More approval, guardrail, or workflow clarification is required."
  - Should appear in dashboard and workflow detail views.
  - In chat, this should be phrased as saved-but-not-ready, not failed.

- `ready`
  - Accurate user meaning: "Saved and eligible to run."
  - This does not guarantee side effects are unguarded; future runs still pass through policy.

- `archived`
  - Accurate user meaning: "Stored but intentionally unavailable for running."
  - Since archive mutation is not shown here, exposing archive UX may be premature.

### Workflow run

- `pending`
  - Accurate meaning: "Run record created and queued/awaiting execution path."
  - Do not present as already executing.

- `blocked`
  - Accurate meaning: "Run could not proceed because policy, approval, or run-readiness checks blocked it."
  - Always pair with `blockedReason`.

- `running`
  - Accurate meaning: "Execution started."

- `failed`
  - Accurate meaning: "Execution started but failed."

- `completed`
  - Accurate meaning: "Execution finished successfully."

- `cancelled`
  - Accurate meaning: "Execution was stopped or cancelled."

- `ready`
  - Not safe to expose as a user-facing run state yet because current run creation flow does not appear to emit it.

### Approval request

- `pending`
  - Accurate meaning: "Waiting for your explicit decision."

- `approved`
  - Accurate meaning: "You approved this request."
  - Important: this does not necessarily mean execution already happened.

- `rejected`
  - Accurate meaning: "You rejected this request."

### Policy / crypto decisions

- `allow`
  - Accurate meaning: "The backend currently allows this to proceed automatically."

- `approve`
  - Accurate meaning: "The backend requires your approval before this can proceed."

- `deny`
  - Accurate meaning: "The backend will not proceed with this action."

- `simulate`
  - Accurate meaning: "The backend intentionally does not allow live execution here; this is dry-run/simulate-only."

Critical UX rule:

- Do not use language like "approved to execute" for a crypto action that is merely `within_cap` and `allowlisted`. The current code still returns `approve`, not `allow`, for write-like crypto actions.

### Schedule

- `active`
  - Accurate meaning: "This schedule is considered enabled in the app and has a GitHub Actions deployment bundle ready."
  - Important: `active` does not prove the GitHub repo has actually been synced.

- `paused`
  - Accurate meaning: "The user paused this schedule in app state."
  - Current code sets deployment state back to `pending_manual_sync` on pause.

- `blocked`
  - Accurate meaning: "The backend refused to activate this schedule because workflow readiness or policy conditions were not met."

- `draft`
  - This exists in schema, but current upsert flow does not appear to create it. Avoid relying on it in WP9 without confirming another path.

### Schedule deployment state

- `pending_manual_sync`
  - Accurate meaning: "The platform generated GitHub Actions instructions and secrets, but a human still needs to create/update the workflow file and secrets in GitHub."

- `needs_resync`
  - Accurate meaning: "The workflow changed after scheduling, so the existing GitHub Actions definition may be stale and must be updated manually."

- `blocked`
  - Accurate meaning: "Deployment cannot proceed because activation is currently blocked."

- `synced`
  - Not safe to claim unless another path actually verifies sync. Current reviewed code does not set this state.

## 4. State Combinations That Need Care

### Workflow `ready` + policy decision `approve`

- A workflow can be structurally ready but still produce an approval-required run outcome.
- UI should distinguish "workflow is runnable in structure" from "this specific run still needs approval".

### Workflow `draft` + saved successfully

- Saving succeeds even when workflow remains unrunnable.
- UX must not equate "saved" with "ready".

### Approval `approved` + no proof of execution

- Approval resolution records the decision, but approval alone does not prove execution happened.
- UX should show "approved" separately from run/result state.

### Crypto `within_cap` + `allowlisted` + decision `approve`

- This is likely the most misleading combination if exposed poorly.
- Current backend means: the action passed hard-cap/allowlist checks but still needs explicit approval before live execution.

### Schedule `active` + deployment `pending_manual_sync`

- This means "active in the app" but not necessarily active in GitHub.
- UX should not say "live and running" unless there is a verified sync model, which the current reviewed code does not provide.

### Schedule `paused` + deployment `pending_manual_sync`

- Current implementation resets deployment state to `pending_manual_sync` on pause.
- This is machine-readable, but user meaning is awkward because paused does not intuitively imply manual sync required.

### Schedule `blocked` + workflow status `ready`

- This can happen when workflow structure is ready but policy rejects scheduling, especially for crypto or non-GitHub-appropriate cases.
- UX needs schedule-specific explanation rather than reusing generic workflow-ready copy.

### Legacy approval + new approval request coexistence

- `ToolApproval` and `ApprovalRequest` both exist.
- WP9 should normalize them in presentation or explicitly hide legacy shape from users.

## 5. Gaps / Ambiguities

### Workflow / run gaps

- `workflowRunStatusSchema` includes `ready`, but current creation flow does not appear to emit it.
- There is no explicit field that means "saved but blocked specifically by approval" versus "saved but blocked by open questions" at the top workflow level beyond interpreting safety + plan fields together.
- There is no first-class workflow-level "why not runnable" summary field; UX must derive this from multiple fields.

### Approval gaps

- Approval request statuses are lowercase while legacy tool approval statuses are uppercase.
- Approval records do not provide a unified cross-type response model out of the API; the same endpoint may return either shape.
- There is no explicit field like `executionResumedAt` or `executedAfterApproval`.

### Crypto gaps

- Current crypto guardrail output has strong machine-readable decisions, but it does not distinguish "user can fix this by editing config" from "user can fix this by approving" in one top-level actionable field.
- Daily cap is persisted in config, but current reviewed guardrail logic shown here primarily enforces per-transaction cap and destination allowlist, not cumulative daily usage accounting.
- `allow` for read-only crypto actions is safe, but users may still infer endorsement if copy is not precise.

### Scheduling gaps

- `pending_manual_sync` is clear in code but needs explicit UX copy to avoid users assuming automatic deployment.
- `synced` exists in schema but is not shown as being set by reviewed service paths.
- There is no explicit `lastDispatchAttemptAt` separate from `lastTriggeredAt`.
- There is no explicit field for `syncVerifiedAt` or GitHub-side verification status.
- There is no field for a schedule version or workflow-definition hash to explain why `needs_resync` happened beyond free-text reason.

### Recurring-run visibility gaps

- Current schedule fields provide:
  - `lastTriggeredAt`
  - `lastSuccessfulAt`
  - `lastRunId`
  - `lastError`
  - `consecutiveFailures`
- Missing fields that would materially improve schedule management UX:
  - explicit `lastBlockedAt`
  - explicit `lastFailedAt`
  - explicit `nextExpectedRunAt`
  - explicit `syncVerifiedAt`
  - explicit `lastDispatchStatus`
  - explicit `failureWindow` or cumulative run stats

## 6. WP9 Requirements Derived From Current Backend

WP9 can proceed, but it should treat these as required contract rules:

1. Distinguish save state from runnability

- A workflow card/detail must separately show:
  - saved status
  - runnability status
  - approval/guardrail reasons

2. Distinguish policy result from execution result

- Approval and policy decisions should not be merged into run outcome language.
- "Approved", "blocked", "simulate-only", and "completed" must remain separate concepts.

3. Normalize approval entity presentation

- WP9 should present a single approval UX model even though backend currently has both `ApprovalRequest` and legacy `ToolApproval`.

4. Treat crypto `approve` as still blocked from auto-execution

- For crypto UX, `approve` means manual approval required, not safe auto-run.
- `within_cap` and `allowlisted` should be shown as subconditions, not final permission.

5. Treat schedule deployment and schedule activation as separate concepts

- WP9 must separately surface:
  - schedule enabled/disabled state
  - GitHub Actions sync state
  - last trigger/result visibility

6. Use exact backend reasons where possible

- `blockedReason`, `deploymentReason`, policy `reason`, and crypto `reason` should be primary explanatory copy inputs.

7. Avoid exposing schema-only states as active product claims

- Avoid promising `WorkflowRun.ready` or `WorkflowSchedule.synced` behavior unless runtime paths are verified.

## 7. Recommended UI Priorities

### Priority 1: Workflow saved vs runnable clarity

- Show "Saved" and "Ready to run" as separate concepts.
- For draft workflows, surface the dominant blocking reason from:
  - approval requirement
  - financial/crypto guardrails
  - open questions

### Priority 2: Approval and policy messaging normalization

- One approval component should handle:
  - pending approval
  - approved but not yet executed
  - rejected
  - simulate-only
  - denied

### Priority 3: Schedule activation vs sync separation

- Schedule management UI should show two rows or badges:
  - app schedule status
  - GitHub sync status

### Priority 4: Recurring-run observability

- Use current fields to show:
  - last triggered
  - last successful
  - last error
  - consecutive failures
- Mark this as partial visibility, not full scheduler observability.

### Priority 5: Crypto subcondition messaging

- For crypto-related actions, show:
  - decision
  - cap status
  - allowlist status
  - whether manual approval is still required

## 8. Deferred / Not Yet Safe To Expose

- "This schedule is fully live in GitHub" unless sync verification exists
- "This crypto action is approved to execute" when backend decision is still `approve`
- "This workflow run is ready" as a user-facing state unless a real emitting path is confirmed
- archive-management UX unless archive mutation path is confirmed
- autonomous recurring crypto execution as a user-facing capability

## Backend Contract For WP9

WP9 should treat the following as the current safe contract:

- Workflow top-level display can rely on:
  - `workflow.status`
  - `workflow.plan.readiness`
  - `workflow.plan.openQuestions`
  - `workflow.safety.*`
  - `workflow.latestRunStatus`
  - `workflow.schedule`

- Workflow run display can rely on:
  - `run.status`
  - `run.blockedReason`
  - `run.lastError`
  - `run.startedAt`
  - `run.finishedAt`
  - `run.retryHistory`

- Approval display can rely on:
  - `id`
  - `summary`
  - `status`
  - `reason`
  - `toolName?`
  - `workflowId?`
  - `createdAt`
  - `resolvedAt?`

- Crypto decision display can rely on:
  - `decision`
  - `reason`
  - `cryptoActionType`
  - `capStatus`
  - `allowlistStatus`
  - `simulateOnly`
  - `requiresApproval`

- Schedule display can rely on:
  - `status`
  - `deploymentState`
  - `deploymentReason`
  - `cronExpression`
  - `timezone`
  - `githubWorkflowPath`
  - `githubSecretName`
  - `lastTriggeredAt`
  - `lastSuccessfulAt`
  - `lastRunId`
  - `lastError`
  - `consecutiveFailures`
  - optional `deploymentBundle`

Anything beyond that should be treated as inferred UX, not guaranteed backend contract.
