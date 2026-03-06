"use client";

import { type WorkflowRunStatus } from "@/lib/workflows/schema";

interface WorkflowRunCardProps {
    run: {
        id: string;
        status: WorkflowRunStatus;
        triggerSource: string;
        blockedReason?: string | null;
        startedAt?: string | null;
        finishedAt?: string | null;
        lastError?: { message: string } | null;
        estimatedTokens?: number | null;
        actualTokens?: number | null;
        costAttributionMethod?: string | null;
    };
    onAction?: (action: string) => void;
}

export function WorkflowRunCard({ run, onAction }: WorkflowRunCardProps) {
    const getStatusTheme = (status: WorkflowRunStatus) => {
        switch (status) {
            case "completed": return { label: "Success", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: "✓" };
            case "failed": return { label: "Failed", color: "text-rose-500 bg-rose-500/10 border-rose-500/20", icon: "✗" };
            case "running": return { label: "Running", color: "text-blue-500 bg-blue-500/10 border-blue-500/20 animate-pulse", icon: "⚙️" };
            case "blocked": return { label: "Blocked", color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: "✋" };
            case "pending": return { label: "Queued", color: "text-muted-foreground bg-muted/20 border-border", icon: "⏳" };
            case "ready": return { label: "Ready", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", icon: "⚡" };
            case "cancelled": return { label: "Stopped", color: "text-muted-foreground bg-muted/10 border-border", icon: "⊘" };
            default: return { label: status, color: "text-muted-foreground bg-muted/10 border-border", icon: "•" };
        }
    };

    const formatTime = (iso?: string | null) => {
        if (!iso) return null;
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const theme = getStatusTheme(run.status);
    const isBlocked = run.status === "blocked";
    const isFailed = run.status === "failed";

    return (
        <div className={`my-4 border rounded-2xl overflow-hidden text-sm shadow-md transition-all ${
            isBlocked ? "border-amber-500/30 bg-amber-500/[0.02]" : "border-border/60 bg-card/50"
        }`}>
            {/* Header */}
            <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black font-mono text-muted-foreground opacity-60">RUN #{run.id.slice(-6)}</span>
                    <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${theme.color}`}>
                        <span>{theme.icon}</span>
                        <span>{theme.label}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-black opacity-60">Source:</span>
                    <span className="text-[10px] text-foreground font-black uppercase italic tracking-tight">{run.triggerSource}</span>
                </div>
            </div>

            <div className="p-5 space-y-4">
                {isBlocked && (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl shadow-inner">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-amber-500 font-bold">⚠️</span>
                            <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.15em]">Run Blocked Pending Review</p>
                        </div>
                        <p className="text-xs text-amber-100/80 italic leading-relaxed font-medium">
                            {run.blockedReason || "The backend blocked this run. Review the policy or approval requirement before retrying."}
                        </p>
                        <div className="mt-4 flex gap-3">
                            <button 
                                onClick={() => onAction?.("view_approval")}
                                className="flex-1 bg-amber-500 text-black py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 italic"
                            >
                                REVIEW NOW
                            </button>
                            <button 
                                onClick={() => onAction?.("dismiss")}
                                className="flex-1 border border-amber-500/30 text-amber-500 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/10 transition-all italic"
                            >
                                IGNORE
                            </button>
                        </div>
                    </div>
                )}

                {isFailed && run.lastError && (
                    <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                        <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mb-2">Error Diagnostic</p>
                        <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                            <p className="text-xs text-rose-200/90 font-mono break-all leading-relaxed">
                                {run.lastError.message}
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-6 px-1">
                    <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1 opacity-60 italic">Engaged At</p>
                        <p className="text-sm font-black text-foreground/90">{formatTime(run.startedAt) || "—"}</p>
                    </div>
                    <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1 opacity-60 italic">Resolved At</p>
                        <p className="text-sm font-black text-foreground/90">{formatTime(run.finishedAt) || "—"}</p>
                    </div>
                </div>

                {(run.estimatedTokens || run.actualTokens) && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
                        {run.estimatedTokens !== null && run.estimatedTokens !== undefined && (
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                                <p className="text-[9px] text-blue-400 uppercase tracking-widest font-black mb-1">Estimated</p>
                                <p className="text-sm font-black text-blue-200">{run.estimatedTokens.toLocaleString()} tokens</p>
                            </div>
                        )}
                        {run.actualTokens !== null && run.actualTokens !== undefined && run.status === "completed" && (
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                                <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-black mb-1">
                                    {run.costAttributionMethod === "exact" ? "Actual Cost" : "Attributed Usage"}
                                </p>
                                <p className="text-sm font-black text-emerald-200">{run.actualTokens.toLocaleString()} tokens</p>
                                {run.costAttributionMethod === "time_window_attributed" && (
                                    <p className="text-[8px] text-emerald-500/60 mt-1 italic leading-tight">
                                        Approximate based on time window
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {run.status === "running" && (
                    <div className="pt-2 px-1">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] text-primary font-black uppercase tracking-widest animate-pulse italic">In Progress...</span>
                            <span className="text-[10px] text-muted-foreground font-mono">LIVE FEED</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-accent w-1/3 animate-[shimmer_2s_infinite] transition-all shadow-[0_0_10px_rgba(109,40,217,0.5)]" />
                        </div>
                    </div>
                )}
            </div>
            
            {!isBlocked && (
                <div className="px-5 py-3 bg-white/[0.02] border-t border-border/60 flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest italic opacity-60">
                        {run.status === "completed" ? "Protocol Executed Successfully" : 
                         run.status === "running" ? "Active Connection" : 
                         "Awaiting Compute Resource"}
                    </span>
                    <button className="text-[10px] text-primary hover:text-primary/80 font-black uppercase tracking-widest transition-colors border-b border-primary/30">
                        Full Audit Log
                    </button>
                </div>
            )}
        </div>
    );
}
