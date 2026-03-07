# Closure Note - Current Wedge Status and Deferred Backlog

## 1. Complete Now
The current wedge focuses on a "Useful Operator Core" for the pump.fun ecosystem. All primary work packages (WP1–WP9) have been implemented and accepted.

### Accepted Work Packages
- **WP1: Chat-to-Workflow Compiler** – Natural language to structured plans.
- **WP2: Workflow Persistence + Runner** – Durable workflows and run history.
- **WP3/3.1: Approval + Policy Engine** – Centralized gatekeeper for risky actions.
- **WP4: Crypto Guardrails** – Hard caps, allowlists, and dry-run modes.
- **WP5: Scheduling via GitHub Actions** – Reliable recurring job infra.
- **WP6: Tool Recommendation Layer** – Heuristic-based tool selection.
- **WP7: Specialist Delegation** – Specialist subagent orchestration.
- **WP8: Usage Accounting + Pricing** – Tokenized credits with 70% burn mechanic.
- **WP9: UX Simplification** – Cohesive status/approval states and reduced friction.

### User-Visible Capabilities
- **Direct Interaction**: Chat-based intent capture and plan refinement.
- **Workflow Lifecycle**: Save, trigger (manual/scheduled), and monitor workflow runs.
- **Safety Dashboard**: View and resolve pending approval requests for financial or dangerous actions.
- **Transparency**: Post-run cost reporting and audit logs for all crypto-sensitive events.

## 2. Current Wedge Support
- **Chat**: Primary interface for all platform interactions.
- **Workflow Planning/Saving**: Explicit "draft" vs "ready" states based on policy/safety criteria.
- **Guarded Workflow Runs**: Every run is evaluated by the policy engine (allow | approve | deny | simulate).
- **Approval/Policy Handling**: Unified `ApprovalRequest` records for human-in-the-loop decisions.
- **Crypto Guardrails**: Enforcement of per-transaction caps and destination allowlists with USD estimations.
- **Scheduling**: Support for cron-based schedules via GitHub Actions.
- **Tool Recommendations**: Suggestions for better tools based on speed, cost, and reliability metadata.
- **Bounded Specialist Delegation**: Parent agents can spawn specialists with bounded credit budgets.
- **Usage Accounting / Workflow Cost Estimation**: Pre-run estimates vs. post-run actuals logged in `WorkflowRun`.

## 3. Intentionally Minimal
- **Tool-Cost Catalog**: Currently defaults to 0 or fixed estimates; requires external vendor (Composio) data for higher precision.
- **Scheduling Sync**: "Manual-sync" model where the platform generates the bundle/secrets, but the user performs the final GitHub push.
- **Dynamic Pricing**: Stable, tiered pricing (Standard/Premium/Ultra) chosen over complex variable pricing.
- **UI Coverage**: Focused on critical "connect -> plan -> approve -> run" paths; non-essential dashboarding is minimal.

## 4. Explicitly Deferred
- **Exact Workflow-to-Transaction Attribution**: Granular per-step transaction linking is deferred to later auditing enhancements.
- **Comprehensive Tool-Cost Catalog**: Waiting for structured API cost metadata from partners.
- **Broader UI/Browser E2E Coverage**: Focus remains on backend correctness and core UX flows.
- **Automated Repo Write**: Direct GitHub API repo writes for scheduling deployment are deferred for safety.
- **Autonomous Recurring Crypto Execution**: Intentionally blocked to prevent "black box" fund movement.

## 5. Suggested Next-Package Candidates
- **Advanced Tool-Cost Integration**: Ingesting real-time execution costs for deeper pricing accuracy.
- **Automated Sync/Deployment**: Optional automated GitHub sync for high-trust users.
- **Live Trading Expansion**: Moving beyond simple swaps to more complex order types.
- **Limit Management UI**: Dedicated panel for managing policy thresholds and allowlists.
