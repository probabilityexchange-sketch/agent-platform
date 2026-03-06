# Employee-Agent Platform Execution Plan

## Goal
Build an agent platform for the pump.fun ecosystem that feels like a real employee: chat-native, action-taking, workflow-driven, secure around money movement, and useful enough that the founder relies on it daily.

## Product Thesis
- Target users: pump.fun and crypto-native users who want leverage, automation, and better tool orchestration.
- Core experience: users describe work in chat, the agent plans it, executes it, saves reusable workflows, and can spawn subagents when needed.
- Differentiators:
  - stronger security and approval boundaries than OpenClaw
  - better UX and easier workflow authoring
  - Composio-backed tool execution
  - ability to recommend better/faster/cheaper tools
  - token-aligned usage model

## Non-Negotiables
- Financial actions must start with hard caps and approval gates.
- Read/write scopes must be explicit per tool, workflow, and user.
- Payment and trading actions need audit logs.
- Workflow creation must feel natural in chat, not like programming.
- Scheduling should prefer GitHub Actions over ad-hoc cron where practical.
- Token pricing must cover infra even with the current 70% burn mechanic.

## Phase 1 Wedge
Do not try to build the full employee agent all at once.

Ship a crypto-native operator that is great at:
1. research + summarization + tool usage
2. workflow creation from chat
3. monitoring + alerts + recurring automations
4. guarded crypto actions under strict limits

Treat credit-card payments as a later, higher-trust phase unless a narrow safe use case emerges sooner.

## Definition of Success
Within 90 days, the product should:
- save the founder meaningful time every week
- run at least 3 recurring workflows reliably
- support guarded financial actions with clear approval UX
- be useful enough that the founder would miss it if it disappeared
- be structured well enough to onboard early external users in the pump.fun ecosystem

## Core Capabilities
### 1. Chat-to-Workflow
- User describes a goal in chat.
- Agent proposes a plan with tools, approvals, costs, and schedule.
- User can run once, edit, or save as a workflow.
- Saved workflows can be triggered manually, by schedule, or by events.

### 2. Tool Intelligence
- Agent selects tools based on speed, cost, reliability, and permissions.
- If a better tool exists, the agent should recommend switching.
- Eventually maintain lightweight tool rankings and fallback choices.

### 3. Subagents
- Main agent delegates bounded tasks to specialist subagents.
- Good early subagent roles:
  - researcher
  - execution operator
  - workflow builder
  - safety/compliance checker
  - reporting/summarizer

### 4. Financial Guardrails
- Require explicit policies before any money movement.
- Start with:
  - per-transaction caps
  - daily caps
  - allowlists for payees, wallets, and exchanges
  - mandatory approval for new destinations
  - dry-run/simulation mode where possible
- Make limits easy to raise later after testing.

### 5. Tokenized Usage
- Token spend should map to product usage in a way that still covers infra.
- Likely direction:
  - usage credits backed by token spend
  - admin-controlled pricing per workflow/action/model tier
  - premium access or higher limits for token holders later

## Architecture Directions
### A. Workflow Runtime
- Chat creates a normalized workflow object.
- Workflow object stores steps, tools, permissions, triggers, budgets, and outputs.
- Execution engine runs steps with approval checkpoints.

### B. Scheduling
- Prefer GitHub Actions for recurring jobs where repo-native execution is acceptable.
- Keep a separate runtime path for interactive or stateful workflows that do not fit Actions.

### C. Safety Layer
- Add a policy engine between agent intent and tool execution.
- Policy engine decides: allow, require approval, deny, simulate.

### D. Observability
- Every workflow run should capture:
  - steps attempted
  - tools used
  - approvals requested
  - costs incurred
  - final outcome

## Phased Roadmap
### Phase 1: Useful Operator Core
- chat-to-workflow UX
- saved workflows
- GitHub Actions-backed scheduling for safe recurring jobs
- Composio tool execution improvements
- approval gate + transaction caps
- basic wallet/trade guardrails

### Phase 2: Employee Behavior
- subagent orchestration
- persistent memory and preferences
- better tool recommendation logic
- richer dashboard for active workflows, alerts, and outcomes

### Phase 3: High-Trust Actions
- more advanced live trading
- carefully scoped payment flows
- policy tuning and limit management UI
- stronger billing/token integration

## Delegable Work Packages
These should be small enough to hand to other agents in parallel.

### WP1. Chat-to-Workflow Compiler
- Outcome: user can describe a workflow in chat and get a structured plan back.
- Deliverables:
  - workflow schema
  - prompt/system logic for turning chat into executable plans
  - edit/confirm/run-once/save flow
- Done when:
  - at least 3 workflow prompts convert into usable plans

### WP2. Workflow Persistence + Runner
- Outcome: workflows can be saved and executed reliably.
- Deliverables:
  - DB models for workflows and runs
  - execution state machine
  - run history and status reporting
- Done when:
  - a saved workflow can run, fail safely, and be re-run

### WP3. Approval + Policy Engine
- Outcome: all risky actions pass through a central decision layer.
- Deliverables:
  - policy model
  - decision types: allow / approve / deny / simulate
  - reusable approval UI
- Done when:
  - risky actions cannot bypass the policy layer

### WP4. Crypto Guardrails
- Outcome: crypto actions work only within strict configurable limits.
- Deliverables:
  - transaction cap config
  - allowlists
  - dry-run mode
  - audit logging
- Done when:
  - low-limit test actions work and blocked actions fail safely

### WP5. Scheduling via GitHub Actions
- Outcome: recurring safe workflows run on schedules without custom cron infra.
- Deliverables:
  - Actions generation strategy
  - secrets/permissions model
  - scheduled workflow templates
- Done when:
  - at least 1 recurring workflow runs on schedule with logs

### WP6. Tool Recommendation Layer
- Outcome: the agent suggests better tools when appropriate.
- Deliverables:
  - tool metadata model
  - recommendation heuristics for speed/cost/reliability
  - chat UX for “use this instead” suggestions
- Done when:
  - the agent can justify at least 2 tool substitutions clearly

### WP7. Subagent Orchestration
- Outcome: main agent can spawn specialists with bounded scope.
- Deliverables:
  - subagent task contract
  - role templates
  - result merge-back behavior
- Done when:
  - one parent task can spawn and coordinate at least 2 specialists

### WP8. Token Billing + Usage Accounting
- Outcome: usage is priced in a way that supports infra and the burn mechanic.
- Deliverables:
  - usage meter
  - pricing model
  - token-to-credit accounting design
- Done when:
  - cost per run can be estimated before execution and logged after

### WP9. UX Simplification Pass
- Outcome: the product feels simpler and more intuitive than OpenClaw.
- Deliverables:
  - journey audit
  - reduced-friction flow for connect, ask, approve, run, save
  - clearer status and approval states
- Done when:
  - a new user can create and run a workflow with minimal explanation

## Recommended Order of Execution
1. WP1 Chat-to-Workflow Compiler
2. WP2 Workflow Persistence + Runner
3. WP3 Approval + Policy Engine
4. WP4 Crypto Guardrails
5. WP5 Scheduling via GitHub Actions
6. WP9 UX Simplification Pass
7. WP7 Subagent Orchestration
8. WP6 Tool Recommendation Layer
9. WP8 Token Billing + Usage Accounting

## Immediate Sprint Plan
### Sprint A: Make the system feel real
- build workflow schema
- convert chat requests into structured plans
- let users save and re-run workflows

### Sprint B: Make it safe
- centralize approval decisions
- add hard transaction caps
- add logs for every risky action

### Sprint C: Make it sticky
- add scheduled recurring workflows
- add subagent support for research/execution/reporting
- add tool-improvement suggestions

## Open Questions to Resolve Later
- exact token pricing formula relative to model/tool costs
- which financial actions are allowed in the first live release
- when to introduce credit-card payments
- how much multi-tenant complexity is needed in phase 1
- whether workflow scheduling should also support non-GitHub runtimes from day one

## Hand-off Instructions for Other Agents
When assigning work, give each agent:
1. one work package only
2. the definition of done from this plan
3. the relevant files and constraints
4. a requirement to add or update tests
5. a requirement to write a short handoff note with decisions and remaining risks

## Recommendation
If speed matters most, focus the next implementation push on WP1 + WP2 + WP3.

That sequence creates the backbone of the product:
- chat describes work
- workflows become durable objects
- risky actions are governed centrally

Everything else becomes much easier once that spine exists.