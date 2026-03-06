import { workflowPlanSchema, type WorkflowPlan, type WorkflowStep } from "./schema";
import { buildToolRecommendationsFromHeuristics } from "./tool-recommendations";

const FINANCIAL_REGEX = /\b(buy|sell|swap|trade|transfer|send money|payment|pay|credit card|wallet|token|sol|usdc|exchange)\b/i;
const WRITE_ACTION_REGEX = /\b(create|update|delete|send|post|publish|deploy|open|submit|write|commit|push)\b/i;
const WORKFLOW_REGEX = /\b(workflow|automation|automate|recurring|repeat|reusable|schedule|scheduled|every|daily|weekly|hourly|monitor|watch|track|alert|notify|save this|run this regularly|cron|github actions)\b/i;
const TOOL_HINTS: Array<[RegExp, string[]]> = [
  [/\bgithub|repo|repository\b/i, ["GitHub"]],
  [/\bslack\b/i, ["Slack"]],
  [/\btelegram|tg\b/i, ["Telegram"]],
  [/\bgmail|email|mail\b/i, ["Gmail"]],
  [/\bnotion\b/i, ["Notion"]],
  [/\bsupabase|database|db\b/i, ["Supabase"]],
  [/\bgoogle sheets|sheets|spreadsheet\b/i, ["Google Sheets"]],
  [/\bpump\.fun|pump fun\b/i, ["pump.fun"]],
  [/\bwallet|solana|token|trade|swap\b/i, ["Solana Wallet"]],
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function looksLikeWorkflowRequest(message: string): boolean {
  const normalized = normalizeWhitespace(message.toLowerCase());
  const hasWorkflowKeyword = WORKFLOW_REGEX.test(normalized);
  const hasMultiStepLanguage = /\b(first|then|next|after that|finally|step)\b/.test(normalized);
  const hasAutomationShape = /\b(if|when|whenever)\b/.test(normalized) && /\b(alert|notify|run|check|monitor|track)\b/.test(normalized);
  return hasWorkflowKeyword || hasMultiStepLanguage || hasAutomationShape;
}

function inferTitle(message: string): string {
  const compact = normalizeWhitespace(message)
    .replace(/^(please|can you|could you|i want you to|help me)\s+/i, "")
    .replace(/[.?!]+$/, "");
  const candidate = compact.split(/[.!?]/)[0]?.trim() || "Workflow Draft";
  return titleCase(candidate.split(/\s+/).slice(0, 8).join(" ")) || "Workflow Draft";
}

function extractSchedulePhrase(message: string): string | undefined {
  const patterns = [
    /\b(every\s+(?:minute|hour|day|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+at\s+[^,.!?]+)?)/i,
    /\b(daily|weekly|hourly|monthly)\b/i,
    /\b(cron\s+[^\s]+(?:\s+[^\s]+){4})/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return normalizeWhitespace(match[1]);
    if (match?.[0]) return normalizeWhitespace(match[0]);
  }
  return undefined;
}

function inferTrigger(message: string): WorkflowPlan["trigger"] {
  const schedule = extractSchedulePhrase(message);
  const normalized = message.toLowerCase();

  if (schedule) {
    return {
      type: "schedule",
      description: `Run on a schedule (${schedule}).`,
      schedule,
      preferredRunner: "github_actions",
    };
  }

  if (/\b(monitor|watch|track|scan|alert me|notify me|opportunity)\b/i.test(normalized)) {
    return {
      type: "monitor",
      description: "Continuously or repeatedly check for a condition and report when it matters.",
      preferredRunner: "github_actions",
    };
  }

  if (/\b(when|whenever|if)\b/i.test(normalized)) {
    return {
      type: "event",
      description: "Run when a stated condition or event happens.",
      preferredRunner: "interactive_runtime",
    };
  }

  return {
    type: "manual",
    description: "Run only when the user explicitly starts it.",
    preferredRunner: "manual",
  };
}

function inferStepKind(description: string): WorkflowStep["kind"] {
  if (/\b(monitor|watch|track|check|scan)\b/i.test(description)) return "monitor";
  if (FINANCIAL_REGEX.test(description)) return "financial";
  if (/\b(alert|notify|send|post|message)\b/i.test(description)) return "notify";
  if (/\b(report|summarize|summary|digest)\b/i.test(description)) return "report";
  if (/\b(if|decide|evaluate|compare|score|rank)\b/i.test(description)) return "decision";
  if (/\b(research|find|search|collect|gather)\b/i.test(description)) return "research";
  return "action";
}

function inferToolHints(description: string): string[] {
  const hints = new Set<string>();
  for (const [pattern, values] of TOOL_HINTS) {
    if (pattern.test(description)) {
      values.forEach((value) => hints.add(value));
    }
  }
  if (hints.size === 0 && /\b(research|find|search|monitor|track)\b/i.test(description)) {
    hints.add("Web Research");
  }
  return [...hints];
}

function extractExplicitSteps(message: string): string[] {
  const bulletSteps = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^([-*]|\d+[.)])\s+/.test(line))
    .map((line) => line.replace(/^([-*]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);

  if (bulletSteps.length > 0) return bulletSteps;

  const flattened = normalizeWhitespace(message)
    .replace(/\b(first|second|third|fourth|fifth)\b[:]?/gi, "")
    .replace(/\b(and then|after that|finally|next)\b/gi, "|")
    .replace(/[.;]+/g, "|");

  return flattened
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.split(/\s+/).length >= 4)
    .slice(0, 5);
}

function buildDefaultSteps(message: string, triggerType: WorkflowPlan["trigger"]["type"]): string[] {
  if (triggerType === "monitor") {
    return [
      `Monitor the requested source or market context for new signals related to: ${normalizeWhitespace(message)}.`,
      "Evaluate whether the observed signal meets the decision criteria.",
      "Deliver an alert or report with the recommended next action.",
    ];
  }

  return [
    `Gather the inputs and context needed for: ${normalizeWhitespace(message)}.`,
    "Execute the core action using the best available tool path.",
    "Summarize the outcome, blockers, and recommended next action.",
  ];
}

function buildSteps(message: string, trigger: WorkflowPlan["trigger"]): WorkflowStep[] {
  const descriptions = extractExplicitSteps(message);
  const rawSteps = descriptions.length > 0 ? descriptions : buildDefaultSteps(message, trigger.type);

  return rawSteps.map((description, index) => {
    const kind = inferStepKind(description);
    return {
      id: `step_${index + 1}`,
      kind,
      description,
      toolHints: inferToolHints(`${message} ${description}`),
      requiresApproval: kind === "financial" || WRITE_ACTION_REGEX.test(description),
    };
  });
}

function buildApprovals(message: string, steps: WorkflowStep[]): WorkflowPlan["approvals"] {
  const approvals: WorkflowPlan["approvals"] = [];
  const financialStepIds = steps.filter((step) => step.kind === "financial").map((step) => step.id);
  const writeStepIds = steps.filter((step) => step.requiresApproval && step.kind !== "financial").map((step) => step.id);

  if (FINANCIAL_REGEX.test(message) || financialStepIds.length > 0) {
    approvals.push({
      type: "required",
      reason: "Financial actions must stay behind explicit approval, hard caps, and audit logging before execution.",
      appliesToStepIds: financialStepIds,
    });
  }

  if (WRITE_ACTION_REGEX.test(message) || writeStepIds.length > 0) {
    approvals.push({
      type: "recommended",
      reason: "This workflow appears to write to an external system, so scopes and approval boundaries should be explicit.",
      appliesToStepIds: writeStepIds,
    });
  }

  return approvals;
}

function buildToolRecommendations(message: string, trigger: WorkflowPlan["trigger"]): WorkflowPlan["toolRecommendations"] {
  return buildToolRecommendationsFromHeuristics(message, trigger);
}

function buildOpenQuestions(message: string, trigger: WorkflowPlan["trigger"], steps: WorkflowStep[]): string[] {
  const questions = new Set<string>();
  const normalized = message.toLowerCase();

  if ((trigger.type === "monitor" || trigger.type === "event") && !/\b(if|when|whenever|above|below|crosses|threshold|opportunity)\b/i.test(normalized)) {
    questions.add("What exact condition should trigger action or an alert?");
  }
  if ((trigger.type === "schedule" || trigger.type === "monitor") && !trigger.schedule) {
    questions.add("What exact cadence should this run on?");
  }
  if (/\b(alert|notify|send|post|report)\b/i.test(normalized) && !/\b(slack|telegram|email|gmail|notion|github)\b/i.test(normalized)) {
    questions.add("Where should updates or alerts be delivered?");
  }
  if (FINANCIAL_REGEX.test(normalized)) {
    questions.add("What transaction caps and allowlists should apply before any money movement is enabled?");
  }
  if (steps.every((step) => step.toolHints.length === 0)) {
    questions.add("Which tools or integrations should this workflow be allowed to use?");
  }

  return [...questions];
}

function buildRiskNotes(message: string, steps: WorkflowStep[]): string[] {
  const notes = new Set<string>();
  if (FINANCIAL_REGEX.test(message)) {
    notes.add("Do not execute financial actions without explicit approval, caps, and audit logging.");
  }
  if (steps.some((step) => step.requiresApproval)) {
    notes.add("External write actions should remain behind explicit approval until policy rules are in place.");
  }
  if (/\b(monitor|watch|track|scan)\b/i.test(message)) {
    notes.add("Monitoring workflows need clear thresholds to avoid noisy alerts or unnecessary runs.");
  }
  return [...notes];
}

export function compileWorkflowPlan(message: string): WorkflowPlan {
  const sourceRequest = normalizeWhitespace(message);
  const trigger = inferTrigger(sourceRequest);
  const steps = buildSteps(sourceRequest, trigger);
  const approvals = buildApprovals(sourceRequest, steps);
  const toolRecommendations = buildToolRecommendations(sourceRequest, trigger);
  const openQuestions = buildOpenQuestions(sourceRequest, trigger, steps);
  const riskNotes = buildRiskNotes(sourceRequest, steps);
  const requiresFinancialControls = approvals.some((approval) => approval.reason.toLowerCase().includes("financial"));

  return workflowPlanSchema.parse({
    version: "1",
    status: "draft",
    readiness: requiresFinancialControls ? "needs_policy_confirmation" : "draft_only",
    sourceRequest,
    title: inferTitle(sourceRequest),
    objective: sourceRequest,
    summary: `Draft workflow plan for: ${sourceRequest}`,
    trigger,
    steps,
    approvals,
    toolRecommendations,
    guardrails: {
      requiresExplicitApproval: approvals.length > 0,
      requiresTransactionCaps: requiresFinancialControls,
      requiresAuditLog: requiresFinancialControls || steps.some((step) => step.requiresApproval),
      requiresExplicitScopes: true,
      simulateOnlyByDefault: requiresFinancialControls,
      schedulingPreference: trigger.type === "manual"
        ? "manual_only"
        : trigger.preferredRunner === "interactive_runtime"
          ? "interactive_runtime_if_stateful"
          : "github_actions_when_possible",
    },
    openQuestions,
    riskNotes,
    nextActions: ["edit", "confirm"],
  });
}

export const WORKFLOW_COMPILER_SYSTEM_INSTRUCTION = [
  "WORKFLOW PLANNING MODE:",
  "- You have a local tool named compile_workflow_plan.",
  "- Use it whenever the user asks to automate, monitor, schedule, save, reuse, or refine a multi-step workflow.",
  "- If the user is editing an existing workflow draft, pass the most up-to-date workflow description based on the conversation.",
  "- Do NOT execute external side-effecting tools until the user confirms the workflow.",
  "- After the tool returns, summarize the plan under these headings: ## Workflow Plan, ## Approval + Safety Notes, ## Open Questions, ## Next Step.",
  "- If the workflow includes financial actions, explicitly state that hard caps, explicit approval, explicit scopes, and audit logging are required before execution.",
  "- If the workflow is scheduled or recurring, prefer GitHub Actions over ad-hoc cron where practical.",
  "- If a better, faster, or cheaper tool path is obvious, recommend it.",
  "- Never say a workflow is saved, scheduled, or runnable unless a persistence/runner tool has actually been used.",
].join("\n");
