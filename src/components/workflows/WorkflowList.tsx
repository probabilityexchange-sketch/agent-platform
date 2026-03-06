"use client";

import { type SavedWorkflow } from "@/lib/workflows/schema";

interface WorkflowListProps {
    workflows: SavedWorkflow[];
}

export function WorkflowList({ workflows }: WorkflowListProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {workflows.map((workflow) => {
                const isReady = workflow.status === 'ready';
                const hasSchedule = !!workflow.schedule;
                const needsInfo = workflow.status === 'draft' && workflow.plan.openQuestions.length > 0;
                const runCtaLabel = isReady ? "Submit run" : "Not runnable yet";
                const nextStep = needsInfo
                    ? workflow.plan.openQuestions[0]
                    : isReady
                        ? "Saved and eligible to submit for a run"
                        : workflow.safety.approvalState === 'required'
                            ? "Complete approval and policy requirements before submitting a run"
                            : "Review saved workflow requirements before submitting a run";

                const getScheduleStateCopy = () => {
                    if (!workflow.schedule) {
                        return {
                            title: "No schedule",
                            appBadge: null,
                            deploymentBadge: null,
                            appDetail: null,
                            deploymentDetail: null,
                        };
                    }

                    const { status, deploymentState, deploymentReason } = workflow.schedule;

                    const titleMap: Record<string, string> = {
                        active: "Active Schedule",
                        paused: "Paused Schedule",
                        blocked: "Blocked Schedule",
                        draft: "Draft Schedule",
                    };
                    const appDetailMap: Record<string, string> = {
                        active: "App schedule is active and can submit recurring runs when other runtime checks pass.",
                        paused: "App schedule is paused and will not submit recurring runs until you resume it.",
                        blocked: deploymentReason || "App schedule is blocked and cannot be resumed until the blocker is reviewed and resolved.",
                        draft: "App schedule exists as a draft and is not yet active for recurring runs.",
                    };

                    const deploymentBadgeMap: Record<string, { label: string; className: string }> = {
                        synced: {
                            label: 'GitHub Sync Verified',
                            className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                        },
                        pending_manual_sync: {
                            label: 'Pending GitHub Sync',
                            className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                        },
                        needs_resync: {
                            label: 'Needs GitHub Re-sync',
                            className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                        },
                        blocked: {
                            label: 'Sync Blocked',
                            className: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                        },
                    };

                    const appBadgeMap: Record<string, { label: string; className: string }> = {
                        active: {
                            label: 'App Active',
                            className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                        },
                        paused: {
                            label: 'App Paused',
                            className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                        },
                        blocked: {
                            label: 'App Blocked',
                            className: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                        },
                        draft: {
                            label: 'App Draft',
                            className: 'bg-white/5 text-muted-foreground border-white/10',
                        },
                    };

                    const deploymentBadge = deploymentBadgeMap[deploymentState] || {
                        label: deploymentState,
                        className: 'bg-white/5 text-muted-foreground border-white/10',
                    };
                    const appBadge = appBadgeMap[status] || {
                        label: status,
                        className: 'bg-white/5 text-muted-foreground border-white/10',
                    };

                    const deploymentDetailMap: Record<string, string> = {
                        synced: 'GitHub sync has been verified for the current schedule definition.',
                        pending_manual_sync: 'The app has a schedule definition, but GitHub still needs the workflow file and secrets.',
                        needs_resync: deploymentReason || 'The workflow changed after scheduling, so GitHub must be updated again.',
                        blocked: deploymentReason || 'The deployment is blocked because the schedule activation was refused by policy.',
                    };

                    return {
                        title: titleMap[status] || 'Configured Schedule',
                        appBadge,
                        deploymentBadge,
                        appDetail: appDetailMap[status] || null,
                        deploymentDetail: deploymentDetailMap[deploymentState] || deploymentReason,
                    };
                };

                const scheduleState = getScheduleStateCopy();

                return (
                    <div key={workflow.id} className="flex flex-col gap-4">
                        {/* Workflow Main Info */}
                        <div className={`flex-1 glass-card rounded-[2rem] p-8 border transition-all hover:scale-[1.01] group ${
                            isReady ? "border-emerald-500/30 bg-emerald-500/[0.02]" : "border-border/60 bg-white/[0.02]"
                        }`}>
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${
                                        isReady ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                    }`}>
                                        {isReady ? "⚡" : "🚧"}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-2xl group-hover:text-primary transition-colors italic tracking-tighter leading-tight">
                                            {workflow.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">
                                                ID: {workflow.id.slice(-8)}
                                            </span>
                                            <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                isReady ? "text-emerald-500" : "text-amber-500"
                                            }`}>
                                                {isReady ? "Saved and eligible" : "Saved draft"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                    {workflow.plan.summary}
                                </p>
                                
                                <div className="flex flex-wrap gap-2">
                                    {workflow.safety.containsFinancialSteps && (
                                        <span className="text-[9px] font-black bg-rose-500/10 text-rose-500 px-2.5 py-1 rounded-full border border-rose-500/20 uppercase tracking-widest">
                                            💰 Financial
                                        </span>
                                    )}
                                    {workflow.safety.requiresTransactionCaps && (
                                        <span className="text-[9px] font-black bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest">
                                            🛡️ Capped
                                        </span>
                                    )}
                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${
                                        workflow.safety.riskLevel === 'high' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : 
                                        workflow.safety.riskLevel === 'medium' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    }`}>
                                        {workflow.safety.riskLevel} Risk
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                        <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-1.5 opacity-60">Trigger</p>
                                        <p className="text-sm font-black italic uppercase">{workflow.plan.trigger.type}</p>
                                    </div>
                                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                        <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-1.5 opacity-60">Last Run</p>
                                        <p className="text-sm font-black italic uppercase">{workflow.latestRunStatus || "Never"}</p>
                                    </div>
                                </div>

                                {/* Scheduling Status Inline */}
                                <div className={`p-5 rounded-2xl border ${
                                    hasSchedule ? "bg-primary/5 border-primary/20" : "bg-white/5 border-white/5 border-dashed"
                                }`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className={`text-[10px] font-black uppercase tracking-widest italic ${
                                            hasSchedule ? "text-primary" : "text-muted-foreground/60"
                                        }`}>
                                            {scheduleState.title}
                                        </p>
                                    </div>
                                    {workflow.schedule ? (
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap gap-2">
                                                {scheduleState.appBadge && (
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${scheduleState.appBadge.className}`}>
                                                        {scheduleState.appBadge.label}
                                                    </span>
                                                )}
                                                {scheduleState.deploymentBadge && (
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${scheduleState.deploymentBadge.className}`}>
                                                        {scheduleState.deploymentBadge.label}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-mono font-black text-foreground/90">
                                                {workflow.schedule.cronExpression}
                                            </p>
                                            {scheduleState.appDetail && (
                                                <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                                                    {scheduleState.appDetail}
                                                </p>
                                            )}
                                            {scheduleState.deploymentDetail && (
                                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                                    {scheduleState.deploymentDetail}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <button className="text-xs text-primary hover:text-primary/80 font-black italic transition-colors">
                                            + Configure Recurring Job
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button 
                                        disabled={!isReady}
                                        className="flex-1 bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:hover:bg-white py-4 rounded-2xl text-xs font-black transition-all shadow-xl shadow-white/5 transform hover:-translate-y-0.5 italic"
                                    >
                                        {runCtaLabel.toUpperCase()}
                                    </button>
                                    <button className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-xs font-black transition-all border border-white/5 italic">
                                        HISTORY
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Next Action / Guidance */}
                        <div className={`p-5 rounded-[1.5rem] border flex items-center gap-4 transition-opacity ${
                            needsInfo ? "bg-amber-500/10 border-amber-500/20" : "bg-white/5 border-white/5 opacity-60"
                        }`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                                needsInfo ? "bg-amber-500/20" : "bg-white/5"
                            }`}>
                                {needsInfo ? "💬" : "📝"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${
                                    needsInfo ? "text-amber-500" : "text-muted-foreground"
                                }`}>
                                    Next Action
                                </p>
                                <p className="text-xs text-foreground/90 font-bold truncate">
                                    {needsInfo ? `Resolve: ${nextStep}` : nextStep}
                                </p>
                            </div>
                            {needsInfo && (
                                <button className="text-[10px] font-black text-amber-500 hover:text-amber-400 uppercase tracking-widest border-b border-amber-500/30">
                                    Fix
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
