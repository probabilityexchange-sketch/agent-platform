"use client";

import { useEffect, useState } from "react";
import { WorkflowList } from "@/components/workflows/WorkflowList";
import { type SavedWorkflow } from "@/lib/workflows/schema";

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWorkflows = async () => {
            try {
                const res = await fetch("/api/workflows");
                if (res.ok) {
                    const data = await res.json();
                    setWorkflows(data.workflows || []);
                } else {
                    setError("Vault access denied. Failed to retrieve automations.");
                }
            } catch (err) {
                setError("A connection error occurred while querying the protocol.");
            } finally {
                setLoading(false);
            }
        };

        fetchWorkflows();
    }, []);

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <header className="mb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded border border-primary/20">
                                Protocol v2.0
                            </span>
                        </div>
                        <h1 className="text-5xl font-black italic tracking-tighter mb-4 italic">Automations</h1>
                        <p className="text-muted-foreground font-medium max-w-2xl text-lg opacity-80 leading-relaxed">
                            Persistence layer for managed workflows, recurring agent schedules, and multi-step protocols.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 px-6 py-4 rounded-[1.5rem] shadow-xl">
                        <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Active Matrix</p>
                            <p className="text-xl font-black italic text-primary">{workflows.length} Protocols</p>
                        </div>
                        <div className="w-px h-8 bg-white/10 mx-2"></div>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        </div>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6 shadow-xl shadow-primary/10"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse italic">
                        Accessing Vault Data...
                    </p>
                </div>
            ) : error ? (
                <div className="p-12 glass-card rounded-[2rem] border-rose-500/20 bg-rose-500/[0.02] text-center">
                    <span className="text-4xl mb-4 block">📡</span>
                    <h2 className="text-xl font-black italic text-rose-400 mb-2 uppercase tracking-tight">Signal Interrupted</h2>
                    <p className="text-muted-foreground font-medium italic">{error}</p>
                </div>
            ) : workflows.length === 0 ? (
                <div className="glass-card rounded-[3rem] p-20 text-center border-dashed border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/[0.02] group-hover:bg-primary/[0.04] transition-colors duration-700"></div>
                    <div className="relative z-10">
                        <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-primary/20 shadow-2xl shadow-primary/10 group-hover:scale-110 transition-transform duration-500">
                            <span className="text-5xl text-primary drop-shadow-lg">⚡</span>
                        </div>
                        <h2 className="text-3xl font-black italic mb-4 tracking-tight">No Protocols Saved</h2>
                        <p className="text-muted-foreground mb-10 text-lg font-medium max-w-sm mx-auto opacity-70 italic leading-relaxed">
                            The automation matrix is empty. Command Randi to design a workflow in the chat hub to begin.
                        </p>
                        <a
                            href="/chat"
                            className="px-12 py-5 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-lg transition-all shadow-[0_20px_40px_rgba(109,40,217,0.3)] transform hover:-translate-y-1 inline-flex items-center gap-3 italic"
                        >
                            INITIATE CHAT
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </a>
                    </div>
                </div>
            ) : (
                <div className="space-y-12">
                    <div className="flex items-center gap-4 px-2">
                        <div className="h-px flex-1 bg-white/5"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40 italic">Active Transmission Feed</p>
                        <div className="h-px flex-1 bg-white/5"></div>
                    </div>
                    <WorkflowList workflows={workflows} />
                </div>
            )}
            
            <footer className="mt-20 pt-10 border-t border-white/5 text-center">
                <p className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-[0.2em] italic">
                    Managed by Randi Autonomous Orchestrator • Ohio Region Node
                </p>
            </footer>
        </div>
    );
}

