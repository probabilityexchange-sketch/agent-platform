"use client";

import { 
    type WorkflowScheduleStatus, 
    type WorkflowScheduleDeploymentState 
} from "@/lib/workflows/schema";

interface WorkflowScheduleCardProps {
    schedule: {
        id: string;
        status: WorkflowScheduleStatus;
        deploymentState: WorkflowScheduleDeploymentState;
        deploymentReason?: string | null;
        cronExpression: string;
        timezone: string;
        lastTriggeredAt?: string | null;
        lastSuccessfulAt?: string | null;
        lastError?: string | null;
        consecutiveFailures: number;
        githubWorkflowPath?: string | null;
    };
    onAction?: (action: string) => void;
}

export function WorkflowScheduleCard({ schedule, onAction }: WorkflowScheduleCardProps) {
    const getStatusTheme = (status: WorkflowScheduleStatus) => {
        switch (status) {
            case "active": return { label: "Active in app", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
            case "paused": return { label: "Paused", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
            case "blocked": return { label: "Blocked", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" };
            default: return { label: status, color: "text-muted-foreground bg-muted/20 border-border" };
        }
    };

    const getSyncTheme = (state: WorkflowScheduleDeploymentState) => {
        switch (state) {
            case "synced": return { label: "GitHub sync verified", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" };
            case "pending_manual_sync": return { label: "Pending first GitHub sync", color: "text-amber-400 border-amber-500/30 bg-amber-500/5" };
            case "needs_resync": return { label: "Needs GitHub re-sync", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/5" };
            case "blocked": return { label: "Sync blocked", color: "text-rose-400 border-rose-500/30 bg-rose-500/5" };
            default: return { label: state, color: "text-muted-foreground border-border bg-muted/10" };
        }
    };

    const getDeploymentGuidance = () => {
        switch (schedule.deploymentState) {
            case "pending_manual_sync":
                return {
                    title: "Pending First GitHub Sync",
                    body: "The app generated the GitHub Actions bundle, but recurring runs will not happen in GitHub until the workflow file and secrets are added manually.",
                    tone: "bg-primary/5 border-primary/20 text-primary",
                    action: "view_sync_instructions",
                    actionLabel: "EXPORT DEPLOYMENT BUNDLE",
                };
            case "needs_resync":
                return {
                    title: "GitHub Re-sync Required",
                    body: schedule.deploymentReason || "The workflow changed after scheduling. Update the GitHub workflow file and secrets so the deployed definition matches the current workflow.",
                    tone: "bg-indigo-500/5 border-indigo-500/20 text-indigo-400",
                    action: "view_sync_instructions",
                    actionLabel: "VIEW RE-SYNC BUNDLE",
                };
            case "blocked":
                return {
                    title: "Schedule Deployment Blocked",
                    body: schedule.deploymentReason || "The backend is blocking schedule deployment, so GitHub deployment should not proceed yet.",
                    tone: "bg-rose-500/5 border-rose-500/20 text-rose-400",
                    action: null,
                    actionLabel: null,
                };
            case "synced":
                return {
                    title: "GitHub Sync Verified",
                    body: "This schedule is marked as synced. Future runs can still be blocked later by runtime policy or workflow state changes.",
                    tone: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
                    action: null,
                    actionLabel: null,
                };
            default:
                return null;
        }
    };

    const formatTime = (iso?: string | null) => {
        if (!iso) return "Never";
        return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const statusTheme = getStatusTheme(schedule.status);
    const syncTheme = getSyncTheme(schedule.deploymentState);
    const deploymentGuidance = getDeploymentGuidance();

    return (
        <div className="my-4 border border-border/60 bg-card/40 rounded-2xl overflow-hidden text-sm shadow-lg">
            {/* Header */}
            <div className="px-6 py-4 bg-muted/30 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shadow-inner">
                        ⏰
                    </div>
                    <div>
                        <h3 className="font-black text-foreground text-base italic tracking-tight">Recurring Schedule</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black opacity-60">
                            {schedule.cronExpression} ({schedule.timezone})
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border tracking-widest ${statusTheme.color}`}>
                        {statusTheme.label}
                    </span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-[0.1em] ${syncTheme.color}`}>
                        {syncTheme.label}
                    </span>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Deployment Guidance */}
                {deploymentGuidance && (
                    <div className={`p-4 border rounded-2xl ${deploymentGuidance.tone}`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-2">{deploymentGuidance.title}</p>
                        <p className={`text-xs italic leading-relaxed font-medium ${
                            schedule.deploymentState === "blocked"
                                ? "text-rose-100/80"
                                : schedule.deploymentState === "needs_resync"
                                    ? "text-indigo-100/80"
                                    : "text-foreground/80"
                        }`}>
                            {deploymentGuidance.body}
                        </p>
                        {deploymentGuidance.action && deploymentGuidance.actionLabel && (
                            <button 
                                onClick={() => onAction?.(deploymentGuidance.action)}
                                className="mt-4 w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 italic flex items-center justify-center gap-2"
                            >
                                <span>📦</span> {deploymentGuidance.actionLabel}
                            </button>
                        )}
                    </div>
                )}

                {schedule.status === "blocked" && schedule.deploymentState !== "blocked" && (
                    <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                        <p className="text-[10px] text-rose-500 font-black uppercase tracking-[0.15em] mb-2">App Schedule Blocked</p>
                        <p className="text-xs text-rose-100/80 italic leading-relaxed font-medium">
                            {schedule.deploymentReason || schedule.lastError || "Activation refused by safety policy. Check workflow readiness and policy status."}
                        </p>
                    </div>
                )}

                {/* Stats Matrix */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1 opacity-60 italic">Last Fire</p>
                        <p className="text-xs font-black text-foreground/90">{formatTime(schedule.lastTriggeredAt)}</p>
                    </div>
                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1 opacity-60 italic">Last Success</p>
                        <p className="text-xs font-black text-emerald-400">{formatTime(schedule.lastSuccessfulAt)}</p>
                    </div>
                </div>

                {schedule.consecutiveFailures > 0 && (
                    <div className="flex items-center gap-3 text-rose-400 text-[10px] font-black bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 uppercase tracking-widest italic">
                        <span className="text-lg animate-pulse">⚠️</span> {schedule.consecutiveFailures} CONSECUTIVE FAILURES REPORTED
                    </div>
                )}

                {/* Footer Actions */}
                <div className="pt-2 flex gap-3">
                    {schedule.status === "active" ? (
                        <button 
                            onClick={() => onAction?.("pause")}
                            className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-amber-500/20 italic"
                        >
                            PAUSE
                        </button>
                    ) : schedule.status === "blocked" ? (
                        <button 
                            onClick={() => onAction?.("review")}
                            className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/20 italic"
                        >
                            REVIEW REQUIRED
                        </button>
                    ) : schedule.status === "paused" ? (
                        <button 
                            onClick={() => onAction?.("resume")}
                            className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/20 italic"
                        >
                            RESUME
                        </button>
                    ) : (
                        <div className="flex-1 bg-muted/20 border border-border text-muted-foreground py-3 rounded-xl text-[10px] font-black text-center uppercase tracking-widest italic">
                            CONFIGURATION REQUIRED
                        </div>
                    )}
                    <button 
                        onClick={() => onAction?.("configure")}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-foreground py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-border italic"
                    >
                        EDIT CRON
                    </button>
                </div>
            </div>
        </div>
    );
}
