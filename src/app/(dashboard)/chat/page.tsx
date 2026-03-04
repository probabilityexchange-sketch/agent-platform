"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RandiLogo } from "@/components/branding/RandiLogo";

interface Agent {
    id: string;
    slug: string;
    name: string;
    description: string;
    defaultModel: string;
}

interface ChatSession {
    id: string;
    title: string;
    agentId: string;
    agent: {
        name: string;
    };
    createdAt: string;
}

export default function ChatHubPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeTab, setActiveTab] = useState<"new" | "recent">("new");

    const promptChips = [
        "Plan my day from Google Calendar",
        "Summarize this link with sources",
        "Draft an email reply from these notes",
        "Debug this error and propose a fix",
        "Turn this into a checklist",
        "Analyze this data and tell me what matters"
    ];

    useEffect(() => {
        // Fetch agents
        fetch("/api/agents")
            .then((res) => res.json())
            .then((data) => setAgents(data.agents || []))
            .catch((err) => console.error("Error fetching agents:", err));

        // Fetch recent sessions
        fetch("/api/chat/sessions")
            .then((res) => res.json())
            .then((data) => setSessions(data.sessions || []))
            .catch((err) => console.error("Error fetching sessions:", err));
    }, []);

    const leadAgent = agents.find(a => a.slug === "randi-lead");

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 min-h-[calc(100vh-8rem)] flex flex-col justify-center">
            <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-6 flex justify-center">
                    <RandiLogo size="xl" variant="icon-only" animated className="drop-shadow-2xl" />
                </div>
                <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    Ask Randi
                </h1>
                <p className="text-xl text-muted-foreground max-w-xl mx-auto">
                    One chat. Randi routes your request to the right specialist automatically.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <Link
                    href={`/chat/new${leadAgent ? `?agentId=${leadAgent.id}` : ""}`}
                    className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/25 flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Chat
                </Link>
                <button
                    onClick={() => setActiveTab(activeTab === "recent" ? "new" : "recent")}
                    className="px-8 py-4 bg-muted/50 hover:bg-muted text-foreground rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 border border-border"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Recent Chats {sessions.length > 0 && `(${sessions.length})`}
                </button>
            </div>

            {activeTab === "new" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-300">
                    {promptChips.map((chip, i) => (
                        <Link
                            key={i}
                            href={`/chat/new${leadAgent ? `?agentId=${leadAgent.id}` : ""}&prompt=${encodeURIComponent(chip)}`}
                            className="p-4 bg-card/50 border border-border rounded-xl text-sm font-medium hover:border-primary/40 hover:bg-card transition-all text-left group"
                        >
                            <span className="text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2">
                                {chip}
                            </span>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="space-y-3 animate-in fade-in duration-500">
                    {sessions.length === 0 ? (
                        <div className="bg-card/30 border border-dashed border-border rounded-2xl p-8 text-center">
                            <p className="text-muted-foreground">No recent chats found.</p>
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <Link
                                key={session.id}
                                href={`/chat/${session.id}`}
                                className="flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all group"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{session.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">{session.agent.name}</span>
                                        <span className="text-[10px] text-muted-foreground/40">•</span>
                                        <span className="text-[10px] text-muted-foreground/60">{new Date(session.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <svg className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
