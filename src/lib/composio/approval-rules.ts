// ---------------------------------------------------------------------------
// TOOL APPROVAL RULES
// Determines which Composio tool calls require explicit user approval before
// execution. Read-only tools (list, get, search, read) run automatically.
// Write/mutate/destructive tools pause for confirmation.
// ---------------------------------------------------------------------------

/**
 * Tools that execute destructive or sensitive write operations.
 * Any tool name matching one of these prefixes/patterns requires approval.
 */
const REQUIRES_APPROVAL_PATTERNS: RegExp[] = [
    // ── Email ────────────────────────────────────────────────────────────────
    /^GMAIL_SEND/i,
    /^GMAIL_DELETE/i,
    /^GMAIL_TRASH/i,
    /^GMAIL_MODIFY/i,           // modifying labels (archive, mark spam)
    /^GMAIL_REPLY/i,
    /^GMAIL_FORWARD/i,

    // ── GitHub ───────────────────────────────────────────────────────────────
    /^GITHUB_CREATE/i,
    /^GITHUB_UPDATE/i,
    /^GITHUB_DELETE/i,
    /^GITHUB_PUSH/i,
    /^GITHUB_COMMIT/i,
    /^GITHUB_MERGE/i,
    /^GITHUB_CLOSE/i,
    /^GITHUB_FORK/i,
    /^GITHUB_REOPEN/i,
    /^GITHUB_ADD/i,
    /^GITHUB_REMOVE/i,
    /^GITHUB_ASSIGN/i,
    /^GITHUB_REQUEST/i,         // request review

    // ── Slack ────────────────────────────────────────────────────────────────
    /^SLACK_SEND/i,
    /^SLACK_POST/i,
    /^SLACK_DELETE/i,
    /^SLACK_UPDATE/i,
    /^SLACK_CREATE/i,
    /^SLACK_INVITE/i,
    /^SLACK_KICK/i,
    /^SLACK_ARCHIVE/i,
    /^SLACK_UNARCHIVE/i,

    // ── Discord ──────────────────────────────────────────────────────────────
    /^DISCORD_SEND/i,
    /^DISCORD_CREATE/i,
    /^DISCORD_DELETE/i,
    /^DISCORD_EDIT/i,

    // ── Notion ───────────────────────────────────────────────────────────────
    /^NOTION_CREATE/i,
    /^NOTION_UPDATE/i,
    /^NOTION_DELETE/i,
    /^NOTION_APPEND/i,
    /^NOTION_ARCHIVE/i,

    // ── Google Sheets ─────────────────────────────────────────────────────────
    /^GOOGLESHEETS_APPEND/i,
    /^GOOGLESHEETS_UPDATE/i,
    /^GOOGLESHEETS_DELETE/i,
    /^GOOGLESHEETS_CREATE/i,
    /^GOOGLESHEETS_CLEAR/i,
    /^GOOGLESHEETS_BATCH_UPDATE/i,

    // ── Google Calendar ───────────────────────────────────────────────────────
    /^GOOGLECALENDAR_CREATE/i,
    /^GOOGLECALENDAR_UPDATE/i,
    /^GOOGLECALENDAR_DELETE/i,
    /^GOOGLECALENDAR_PATCH/i,

    // ── Google Docs ───────────────────────────────────────────────────────────
    /^GOOGLEDOCS_CREATE/i,
    /^GOOGLEDOCS_UPDATE/i,
    /^GOOGLEDOCS_DELETE/i,
    /^GOOGLEDOCS_INSERT/i,

    // ── Google Drive ──────────────────────────────────────────────────────────
    /^GOOGLEDRIVE_UPLOAD/i,
    /^GOOGLEDRIVE_CREATE/i,
    /^GOOGLEDRIVE_DELETE/i,
    /^GOOGLEDRIVE_MOVE/i,
    /^GOOGLEDRIVE_RENAME/i,
    /^GOOGLEDRIVE_SHARE/i,

    // ── Vercel ────────────────────────────────────────────────────────────────
    /^VERCEL_CREATE/i,
    /^VERCEL_DELETE/i,
    /^VERCEL_DEPLOY/i,
    /^VERCEL_UPDATE/i,
    /^VERCEL_CANCEL/i,
    /^VERCEL_ROLLBACK/i,

    // ── Supabase ─────────────────────────────────────────────────────────────
    /^SUPABASE_INSERT/i,
    /^SUPABASE_UPDATE/i,
    /^SUPABASE_DELETE/i,
    /^SUPABASE_UPSERT/i,
    /^SUPABASE_CREATE/i,
    /^SUPABASE_DROP/i,
    /^SUPABASE_EXECUTE/i,       // raw SQL execution

    // ── Airtable ──────────────────────────────────────────────────────────────
    /^AIRTABLE_CREATE/i,
    /^AIRTABLE_UPDATE/i,
    /^AIRTABLE_DELETE/i,

    // ── Jira ─────────────────────────────────────────────────────────────────
    /^JIRA_CREATE/i,
    /^JIRA_UPDATE/i,
    /^JIRA_DELETE/i,
    /^JIRA_TRANSITION/i,
    /^JIRA_ASSIGN/i,

    // ── Linear ───────────────────────────────────────────────────────────────
    /^LINEAR_CREATE/i,
    /^LINEAR_UPDATE/i,
    /^LINEAR_DELETE/i,
    /^LINEAR_ARCHIVE/i,

    // ── HubSpot / Salesforce / Pipedrive ─────────────────────────────────────
    /^HUBSPOT_CREATE/i,
    /^HUBSPOT_UPDATE/i,
    /^HUBSPOT_DELETE/i,
    /^SALESFORCE_CREATE/i,
    /^SALESFORCE_UPDATE/i,
    /^SALESFORCE_DELETE/i,
    /^PIPEDRIVE_CREATE/i,
    /^PIPEDRIVE_UPDATE/i,
    /^PIPEDRIVE_DELETE/i,

    // ── Twilio ───────────────────────────────────────────────────────────────
    /^TWILIO_SEND/i,            // SMS / WhatsApp
    /^TWILIO_CREATE/i,

    // ── Stripe ───────────────────────────────────────────────────────────────
    /^STRIPE_CREATE/i,
    /^STRIPE_UPDATE/i,
    /^STRIPE_DELETE/i,
    /^STRIPE_CANCEL/i,
    /^STRIPE_REFUND/i,
    /^STRIPE_CAPTURE/i,

    // ── GitLab ───────────────────────────────────────────────────────────────
    /^GITLAB_CREATE/i,
    /^GITLAB_UPDATE/i,
    /^GITLAB_DELETE/i,
    /^GITLAB_MERGE/i,
    /^GITLAB_PUSH/i,

    // ── Asana / ClickUp / Trello ──────────────────────────────────────────────
    /^ASANA_CREATE/i,
    /^ASANA_UPDATE/i,
    /^ASANA_DELETE/i,
    /^CLICKUP_CREATE/i,
    /^CLICKUP_UPDATE/i,
    /^CLICKUP_DELETE/i,
    /^TRELLO_CREATE/i,
    /^TRELLO_UPDATE/i,
    /^TRELLO_DELETE/i,
    /^TRELLO_MOVE/i,
    /^TRELLO_ARCHIVE/i,

    // ── Zapier / Make ─────────────────────────────────────────────────────────
    /^ZAPIER_TRIGGER/i,         // running zaps
    /^MAKE_TRIGGER/i,           // running scenarios

    // ── Telegram ─────────────────────────────────────────────────────────────
    /^TELEGRAM_SEND/i,
    /^TELEGRAM_CREATE/i,
    /^TELEGRAM_DELETE/i,
    /^TELEGRAM_EDIT/i,
];

/**
 * Check if a tool call with the given name requires explicit user approval
 * before execution. Returns true for write/mutate/destructive operations.
 */
export function requiresApproval(toolName: string): boolean {
    return REQUIRES_APPROVAL_PATTERNS.some((pattern) => pattern.test(toolName));
}

/**
 * Human-readable, one-line summary of what a tool call will do.
 */
export function describeToolCall(toolName: string, argsJson: string): string {
    let args: Record<string, unknown> = {};
    try {
        const parsed = JSON.parse(argsJson);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
            args = parsed as Record<string, unknown>;
        }
    } catch {
        // ignore parse failures
    }

    const name = toolName.toLowerCase();

    if (name.includes("send") && name.startsWith("gmail")) {
        return `Send an email to ${args.to || args.recipient || "recipient"}`;
    }
    if (name.includes("send") && (name.startsWith("slack") || name.startsWith("discord"))) {
        return `Post a message to ${args.channel || args.channelId || "a channel"}`;
    }
    if (name.includes("send") && name.startsWith("twilio")) {
        return `Send an SMS/WhatsApp to ${args.to || "a phone number"}`;
    }
    if (name.includes("send") && name.startsWith("telegram")) {
        return `Send a Telegram message to ${args.chat_id || args.username || "recipient"}`;
    }
    if (name.includes("create") && name.startsWith("github")) {
        const resource = toolName.replace(/^GITHUB_CREATE_/i, "").toLowerCase().replace(/_/g, " ");
        return `Create a ${resource} on GitHub`;
    }
    if (name.includes("delete")) {
        const resource = toolName.split("_").slice(1).join(" ").toLowerCase();
        return `Permanently delete: ${resource}`;
    }
    if (name.includes("deploy") || toolName.startsWith("VERCEL_DEPLOY")) {
        return `Deploy project${args.projectId ? ` ${args.projectId}` : ""} on Vercel`;
    }
    if (name.includes("execute") && name.startsWith("supabase")) {
        return `Execute a database query: ${typeof args.query === "string" ? args.query.slice(0, 80) : "SQL query"}`;
    }
    if (name.includes("create") && name.startsWith("stripe")) {
        return `Create a Stripe charge/subscription`;
    }
    if (name.includes("refund") && name.startsWith("stripe")) {
        return `Issue a Stripe refund`;
    }

    // Generic fallback
    const parts = toolName.split("_");
    const service = parts[0] || "Service";
    const action = parts.slice(1).join(" ").toLowerCase();
    return `${service}: ${action}`;
}
