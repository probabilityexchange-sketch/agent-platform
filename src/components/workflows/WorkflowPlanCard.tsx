"use client";

import { useState } from "react";
import { type WorkflowPlan } from "@/lib/workflows/schema";

interface WorkflowPlanCardProps {
    plan: WorkflowPlan;
    onSave?: (plan: WorkflowPlan) => void;
    isSaved?: boolean;
}

export function WorkflowPlanCard({ plan, onSave, isSaved = false }: WorkflowPlanCardProps) {
    const [expanded, setExpanded] = useState(false);

    const readinessLabel = plan.readiness === "needs_policy_confirmation"
        ? isSaved ? "Saved, pending policy confirmation" : "Needs policy confirmation"
        : isSaved ? "Saved, needs workflow details" : "Needs workflow details";
    const readinessDetail = plan.readiness === "needs_policy_confirmation"
        ? isSaved
            ? "This saved workflow still needs policy confirmation before it can become eligible to run."
            : "This proposed plan still needs a policy review before a saved workflow could become eligible to run."
        : isSaved
            ? "This workflow is saved, but it still needs more detail before it can become a runnable workflow."
            : "This proposed plan still needs more workflow detail before it can be saved as a runnable workflow.";
    const nextStepLabel = plan.openQuestions.length > 0
        ? isSaved
            ? "Provide the missing details in chat to finish this saved workflow."
            : "Provide the missing details in chat before saving this workflow."
        : plan.readiness === "needs_policy_confirmation"
            ? isSaved
                ? "Complete the required policy review before attempting a run."
                : "Save the workflow, then complete the required policy review before attempting a run."
            : isSaved
                ? "Review and complete the saved workflow details before attempting a run."
                : "Review and confirm the plan details before saving.";

    const getTriggerIcon = (type: string) => {
        switch (type) {
            case "manual": return "👤";
            case "schedule": return "⏰";
            case "event": return "⚡";
            case "monitor": return "🔍";
            default: return "⚙️";
        }
    };

    const getStepIcon = (kind: string) => {
        switch (kind) {
            case "research": return "📚";
            case "monitor": return "👀";
            case "decision": return "⚖️";
            case "action": return "🛠️";
            case "notify": return "🔔";
            case "financial": return "💰";
            case "report": return "📊";
            default: return "🔹";
        }
    };

    return (
        <div className={`my-4 border rounded-2xl overflow-hidden text-sm shadow-lg transition-all ${
            isSaved ? "border-emerald-500/30 bg-card" : "border-primary/30 bg-card/50"
        }`}>
            {/* Header */}
            <div className={`px-5 py-4 flex items-center justify-between border-b ${
                isSaved ? "bg-emerald-500/5 border-emerald-500/10" : "bg-primary/5 border-primary/10"
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner ${
                        isSaved ? "bg-emerald-500/10" : "bg-primary/10"
                    }`}>
                        {isSaved ? "💾" : "📋"}
                    </div>
                    <div>
                        <h3 className="font-black text-foreground text-base italic tracking-tight">
                            {plan.title || "New Automation"}
                        </h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">
                            {isSaved ? "Saved Workflow" : "Proposed Plan"}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    {isSaved ? (
                        <span className="text-[10px] font-black bg-emerald-500 text-white px-3 py-1 rounded-full uppercase tracking-widest shadow-sm shadow-emerald-500/20">
                            Saved
                        </span>
                    ) : (
                        <span className="text-[10px] font-black bg-primary text-white px-3 py-1 rounded-full uppercase tracking-widest shadow-sm shadow-primary/20">
                            Draft
                        </span>
                    )}
                    {!isSaved && (
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Proposed only</span>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 space-y-6">
                <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-2 opacity-60">Objective</p>
                    <p className="text-sm font-semibold leading-relaxed text-foreground/90">{plan.objective}</p>
                </div>

                {/* Status / Blockers Section — MOVED UP for visibility */}
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-amber-500 text-lg">⚠️</span>
                            <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.15em]">
                                {isSaved ? "Saved Workflow Status" : "Proposed Plan Status"}
                            </p>
                        </div>
                        <p className="text-xs text-amber-100 font-bold mb-3">{readinessLabel}</p>
                        <p className="text-xs text-amber-200/80 leading-relaxed font-medium mb-3">
                            {readinessDetail}
                        </p>
                        <ul className="space-y-2">
                            {plan.readiness === "needs_policy_confirmation" && (
                                <li className="text-xs text-amber-200/80 flex gap-2 font-medium">
                                    <span className="text-amber-500">•</span> Saving this plan does not bypass runtime approval or policy checks.
                                </li>
                            )}
                            {plan.openQuestions.map((q, i) => (
                                <li key={i} className="text-xs text-amber-200/80 flex gap-2 font-medium italic">
                                    <span className="text-amber-500">•</span> Needs info: {q}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 pt-3 border-t border-amber-500/10">
                            <p className="text-[10px] text-amber-500/60 font-black uppercase tracking-widest">Next Step</p>
                            <p className="text-xs text-amber-100 font-bold mt-1">{nextStepLabel}</p>
                        </div>
                    </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-1.5 opacity-60">Trigger</p>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{getTriggerIcon(plan.trigger.type)}</span>
                            <span className="text-xs font-black uppercase tracking-tight">{plan.trigger.type}</span>
                        </div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-1.5 opacity-60">Safety Mode</p>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${plan.guardrails.requiresExplicitApproval ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                                <span className="text-xs font-black uppercase tracking-tight">
                                {plan.guardrails.requiresExplicitApproval ? 'Approval required' : 'Eligible after checks'}
                            </span>
                        </div>
                    </div>
                </div>

                {plan.toolRecommendations.length > 0 && (
                    <div className="p-4 bg-sky-500/5 border border-sky-500/20 rounded-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sky-400 text-lg">🧭</span>
                            <p className="text-[10px] text-sky-400 font-black uppercase tracking-[0.15em]">
                                Suggested Tool Paths
                            </p>
                        </div>
                        <p className="text-xs text-sky-100/80 leading-relaxed font-medium mb-3">
                            These are recommendations only. They describe potentially better tool paths for this workflow and do not mean any tool has been connected, selected, or run.
                        </p>
                        <div className="space-y-3">
                            {plan.toolRecommendations.map((recommendation, index) => (
                                <div key={`${recommendation.currentApproach}-${recommendation.suggestedApproach}-${index}`} className="rounded-2xl border border-sky-500/15 bg-black/20 p-3">
                                    <div className="flex items-center gap-2 text-xs font-black tracking-tight text-sky-100">
                                        <span>{recommendation.currentApproach}</span>
                                        <span className="text-sky-400">→</span>
                                        <span>{recommendation.suggestedApproach}</span>
                                    </div>
                                    <p className="mt-2 text-xs text-sky-100/70 leading-relaxed font-medium">
                                        {recommendation.reason}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Steps Section */}
                <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Execution Steps ({plan.steps.length})</p>
                        <button 
                            onClick={() => setExpanded(!expanded)}
                            className="text-[10px] text-primary hover:text-primary/80 font-black uppercase tracking-widest transition-colors"
                        >
                            {expanded ? "[ Hide ]" : "[ View All ]"}
                        </button>
                    </div>
                    <div className="space-y-2.5">
                        {plan.steps.slice(0, expanded ? undefined : 2).map((step, i) => (
                            <div key={step.id} className="flex gap-4 items-start p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group">
                                <span className="text-[10px] opacity-30 font-black mt-1 group-hover:opacity-60 transition-opacity italic">0{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs">{getStepIcon(step.kind)}</span>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/80">{step.kind}</span>
                                        {step.requiresApproval && (
                                            <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full border border-amber-500/20 font-black tracking-tighter">GATE</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-foreground/80 leading-relaxed font-medium">{step.description}</p>
                                </div>
                            </div>
                        ))}
                        {!expanded && plan.steps.length > 2 && (
                            <div className="text-[10px] text-center text-muted-foreground font-black uppercase tracking-widest pt-2 opacity-40">
                                + {plan.steps.length - 2} additional steps
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Footer */}
                <div className="pt-4 flex gap-3">
                    {!isSaved ? (
                        <button
                            onClick={() => onSave?.(plan)}
                            className="flex-1 bg-primary hover:bg-primary/90 text-white py-3.5 rounded-2xl text-xs font-black transition-all shadow-lg shadow-primary/20 transform hover:-translate-y-0.5 italic"
                        >
                            COMMIT WORKFLOW
                        </button>
                    ) : (
                        <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 py-3.5 rounded-2xl text-xs font-black text-center italic tracking-widest uppercase">
                            ✓ Plan Persistent
                        </div>
                    )}
                    <button className="px-6 py-3.5 border border-border hover:bg-muted rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                        Edit
                    </button>
                </div>
            </div>
        </div>
    );
}
