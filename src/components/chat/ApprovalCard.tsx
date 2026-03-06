"use client";

import { useState, useCallback } from "react";

export interface ApprovalRequest {
    approvalId: string;
    toolName: string;
    toolArgs: string;           // raw JSON string
    description: string;        // human-readable action summary
    sessionId: string;
}

export type ApprovalDecision = "APPROVED" | "REJECTED" | "PENDING" | "approved" | "rejected" | "pending";

interface ApprovalCardProps {
    request: ApprovalRequest;
    onDecision: (approvalId: string, decision: "APPROVED" | "REJECTED") => void;
    decided?: ApprovalDecision;
}

/** Safely pretty-print JSON args, falling back to the raw string */
function formatArgs(raw: string): { entries: [string, string][]; raw: string } {
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
            const entries = Object.entries(parsed as Record<string, unknown>).map(
                ([k, v]): [string, string] => [
                    k,
                    typeof v === "string" ? v : JSON.stringify(v),
                ]
            );
            return { entries, raw };
        }
    } catch {
        // ignore
    }
    return { entries: [], raw };
}

/** Extract the service name from a COMPOSIO tool slug */
function serviceFromToolName(toolName: string): string {
    const service = toolName.split("_")[0];
    const map: Record<string, string> = {
        GMAIL: "Gmail",
        GITHUB: "GitHub",
        GITLAB: "GitLab",
        SLACK: "Slack",
        DISCORD: "Discord",
        NOTION: "Notion",
        GOOGLESHEETS: "Google Sheets",
        GOOGLECALENDAR: "Google Calendar",
        GOOGLEDOCS: "Google Docs",
        GOOGLEDRIVE: "Google Drive",
        VERCEL: "Vercel",
        SUPABASE: "Supabase",
        AIRTABLE: "Airtable",
        JIRA: "Jira",
        LINEAR: "Linear",
        HUBSPOT: "HubSpot",
        SALESFORCE: "Salesforce",
        TWILIO: "Twilio",
        STRIPE: "Stripe",
        TRELLO: "Trello",
        ASANA: "Asana",
        CLICKUP: "ClickUp",
        ZAPIER: "Zapier",
        MAKE: "Make",
        PIPEDRIVE: "Pipedrive",
    };
    return map[service] ?? service;
}

const SERVICE_ICONS: Record<string, string> = {
    Gmail: "📧",
    GitHub: "🐙",
    GitLab: "🦊",
    Slack: "💬",
    Discord: "🎮",
    Notion: "📒",
    "Google Sheets": "📊",
    "Google Calendar": "📅",
    "Google Docs": "📝",
    "Google Drive": "💾",
    Vercel: "▲",
    Supabase: "⚡",
    Airtable: "🗃️",
    Jira: "🔵",
    Linear: "🔷",
    HubSpot: "🧲",
    Salesforce: "☁️",
    Twilio: "📱",
    Stripe: "💳",
    Trello: "📋",
    Asana: "✅",
    ClickUp: "🎯",
    Zapier: "⚡",
    Make: "🔗",
    Pipedrive: "📊",
};

export function ApprovalCard({ request, onDecision, decided = "PENDING" }: ApprovalCardProps) {
    const [loading, setLoading] = useState(false);
    
    // Normalize status to lowercase for internal logic
    const status = decided.toLowerCase();
    
    const service = serviceFromToolName(request.toolName);
    const icon = SERVICE_ICONS[service] ?? "🔧";
    const { entries, raw } = formatArgs(request.toolArgs);

    const handleDecision = useCallback(
        async (decision: "APPROVED" | "REJECTED") => {
            setLoading(true);
            try {
                await fetch("/api/chat/approve", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ approvalId: request.approvalId, decision }),
                });
                onDecision(request.approvalId, decision);
            } catch {
                // allow parent to handle or user can retry
            } finally {
                setLoading(false);
            }
        },
        [request.approvalId, onDecision]
    );

    const isDone = status !== "pending";

    return (
        <div className="my-2 max-w-[90%] lg:max-w-[75%]">
            <div
                className={`rounded-3xl border overflow-hidden transition-all shadow-lg ${
                    status === "approved"
                        ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                        : status === "rejected"
                            ? "border-rose-500/30 bg-rose-500/[0.02]"
                            : "border-amber-500/40 bg-amber-500/[0.02]"
                }`}
            >
                {/* Header */}
                <div
                    className={`px-6 py-4 flex items-center gap-4 border-b ${
                        status === "approved"
                            ? "border-emerald-500/10"
                            : status === "rejected"
                                ? "border-rose-500/10"
                                : "border-amber-500/10"
                    }`}
                >
                    <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Security Gate</span>
                            <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                                status === "approved" ? "text-emerald-500" : status === "rejected" ? "text-rose-500" : "text-amber-500 animate-pulse"
                            }`}>
                                {status === "approved" ? "Decision: Authorized" : status === "rejected" ? "Decision: Refused" : "Awaiting Your Call"}
                            </span>
                        </div>
                        <h3 className="text-base font-black italic tracking-tighter text-foreground leading-tight">
                            {request.description}
                        </h3>
                    </div>
                </div>

                {/* Arguments / Details */}
                {(entries.length > 0 || raw) && (
                    <div className="px-6 py-5 bg-black/20">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3 opacity-50">
                            Payload Manifest
                        </p>
                        {entries.length > 0 ? (
                            <div className="space-y-2">
                                {entries.map(([key, value]) => (
                                    <div key={key} className="flex gap-4 text-xs font-medium">
                                        <span className="text-muted-foreground/60 font-black uppercase tracking-tighter w-24 flex-shrink-0">
                                            {key}
                                        </span>
                                        <span className="text-foreground/90 break-all line-clamp-2">{value}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <pre className="p-3 bg-black/40 rounded-xl border border-white/5 text-[10px] font-mono text-foreground/60 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                                {raw}
                            </pre>
                        )}
                        <p className="text-[10px] text-muted-foreground/40 mt-4 font-mono uppercase tracking-tighter">
                            Tool: {request.toolName}
                        </p>
                    </div>
                )}

                {/* Footer Actions */}
                {!isDone ? (
                    <div className="p-6 flex gap-3">
                        <button
                            onClick={() => handleDecision("APPROVED")}
                            disabled={loading}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase italic tracking-widest transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        >
                            {loading ? "AUTHORIZING..." : "✓ AUTHORIZE"}
                        </button>
                        <button
                            onClick={() => handleDecision("REJECTED")}
                            disabled={loading}
                            className="flex-1 border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 py-3.5 rounded-2xl text-xs font-black uppercase italic tracking-widest transition-all disabled:opacity-50"
                        >
                            ✗ REFUSE
                        </button>
                    </div>
                ) : (
                    <div className="px-6 py-4 bg-muted/10 border-t border-border/40 flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest italic opacity-60">
                            {status === "approved" ? "Approved by user; execution state is tracked separately" : "Action cancelled by user"}
                        </span>
                        <span className="text-[10px] font-mono opacity-30">
                            ID: {request.approvalId.slice(-6)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
