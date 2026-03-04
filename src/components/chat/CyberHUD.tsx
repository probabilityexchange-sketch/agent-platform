"use client";

import { useEffect, useState } from "react";

interface CyberHUDProps {
    agentName: string;
    modelId: string;
    isActive: boolean;
}

export function CyberHUD({ agentName, modelId, isActive }: CyberHUDProps) {
    const [points, setPoints] = useState<number[]>(Array.from({ length: 20 }, () => Math.random() * 100));

    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => {
            setPoints(prev => {
                const newPoints = [...prev.slice(1), Math.random() * 100];
                return newPoints;
            });
        }, 150);
        return () => clearInterval(interval);
    }, [isActive]);

    return (
        <div className="flex flex-col h-full bg-[#0a0a0f] border-l border-white/5 p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

            <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-8 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" />
                Orchestrator HUD
            </h3>

            <div className="space-y-8 relative z-10">
                {/* Node: Agent */}
                <div className="relative">
                    <div className={`absolute -inset-1 rounded-xl blur-md transition-opacity duration-500 ${isActive ? 'bg-primary/20 opacity-100' : 'opacity-0'}`} />
                    <div className="relative flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${isActive ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]' : 'bg-white/5 border-white/10'}`}>
                            <svg className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider mb-1">Active Agent</div>
                            <div className="text-sm font-semibold text-white/90">{agentName || "Lead Orchestrator"}</div>
                        </div>
                    </div>
                </div>

                {/* Vertical connecting line */}
                <div className="relative h-12 flex justify-center">
                    <div className="w-px h-full bg-gradient-to-b from-white/10 via-white/5 to-white/10" />
                    {isActive && (
                        <div className="absolute top-0 w-0.5 h-1/3 bg-primary/60 blur-[1px] animate-[pulse-down_1.5s_ease-in-out_infinite]" />
                    )}
                </div>

                {/* Node: Model */}
                <div className="relative">
                    <div className={`absolute -inset-1 rounded-xl blur-md transition-opacity duration-500 ${isActive ? 'bg-blue-500/10 opacity-100' : 'opacity-0'}`} />
                    <div className="relative flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${isActive ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/10'}`}>
                            <svg className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider mb-1">Inference Engine</div>
                            <div className="text-xs font-semibold text-white/90 truncate max-w-[150px]">{modelId.split('/').pop()}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Neural Activity Graph */}
            <div className="mt-auto mb-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Neural Activity</div>
                    <div className={`text-[10px] font-mono ${isActive ? 'text-emerald-400 animate-pulse' : 'text-white/20'}`}>
                        {isActive ? 'PROCESSING' : 'IDLE'}
                    </div>
                </div>
                <div className="h-16 w-full flex items-end gap-1 opacity-60">
                    {points.map((p, i) => (
                        <div
                            key={i}
                            className={`flex-1 rounded-t-sm transition-all duration-150 ${isActive ? 'bg-primary' : 'bg-white/10'}`}
                            style={{ height: `${isActive ? Math.max(10, p) : 10}%` }}
                        />
                    ))}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulse-down {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(400%); opacity: 0; }
                }
            `}} />
        </div>
    );
}
