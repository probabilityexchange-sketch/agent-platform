"use client";

import Link from "next/link";
import { useState } from "react";

const demoSteps = [
    {
        title: "1. Sign In with Privy",
        description: "Connect using your wallet, email, Google, or social accounts.",
        content: (
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <p className="text-sm text-muted-foreground text-center max-w-xs">
                        Randi uses Privy for seamless authentication. Connect with Phantom, MetaMask, or social logins.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">Phantom</span>
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">Google</span>
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">Email</span>
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">X / Twitter</span>
                    </div>
                </div>
            </div>
        ),
    },
    {
        title: "2. Pick an Agent",
        description: "Browse the catalog and choose an AI assistant tailored for your task.",
        content: (
            <div className="grid grid-cols-2 gap-3">
                {[
                    { name: "Code Assistant", desc: "Write, debug, and refactor code", model: "Llama 3.3 70B" },
                    { name: "Research Agent", desc: "Deep research and analysis", model: "DeepSeek R1" },
                    { name: "Creative Writer", desc: "Content, copy, and creative writing", model: "Gemini Flash" },
                    { name: "Data Analyst", desc: "Charts, queries, and insights", model: "Llama 3.3 70B" },
                ].map((agent) => (
                    <div key={agent.name} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                        <h4 className="font-semibold text-sm mb-1">{agent.name}</h4>
                        <p className="text-[11px] text-muted-foreground mb-2">{agent.desc}</p>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{agent.model}</span>
                    </div>
                ))}
            </div>
        ),
    },
    {
        title: "3. Chat with AI",
        description: "Interact in natural language, get structured responses with markdown and tools.",
        content: (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-3 space-y-3">
                    <div className="flex justify-end">
                        <div className="bg-primary text-white px-4 py-2 rounded-2xl rounded-br-none max-w-[80%] text-sm">
                            Can you write a Python function that calculates Fibonacci numbers iteratively?
                        </div>
                    </div>
                    <div className="flex justify-start">
                        <div className="bg-muted px-4 py-2 rounded-2xl rounded-bl-none max-w-[80%] text-sm space-y-2">
                            <p>Here&apos;s an efficient iterative implementation:</p>
                            <pre className="bg-black/30 rounded-lg p-2 text-xs font-mono overflow-x-auto">
                                {`def fibonacci(n: int) -> int:
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a`}
                            </pre>
                            <p className="text-xs text-muted-foreground">Time complexity: O(n), Space: O(1)</p>
                        </div>
                    </div>
                </div>
            </div>
        ),
    },
    {
        title: "4. Subscribe with RANDI",
        description: "$20/month in RANDI tokens — 10% burned permanently, 90% to treasury.",
        content: (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold">Randi Pro</span>
                    <span className="text-2xl font-bold">$20<span className="text-sm text-muted-foreground font-normal">/mo</span></span>
                </div>
                <div className="text-xs space-y-1 bg-muted/50 rounded-lg p-3">
                    <div className="flex justify-between">
                        <span>Total RANDI</span>
                        <span className="font-mono">~1.84M</span>
                    </div>
                    <div className="flex justify-between">
                        <span>To Treasury (90%)</span>
                        <span className="font-mono">~1.65M</span>
                    </div>
                    <div className="flex justify-between text-orange-400">
                        <span>Burned 🔥 (10%)</span>
                        <span className="font-mono">~184K</span>
                    </div>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-1">
                    <p>✓ Unlimited AI chats  ✓ All tools  ✓ Priority access</p>
                </div>
            </div>
        ),
    },
    {
        title: "5. Use Composio Tools",
        description: "1000+ tool integrations — GitHub, Slack, email, databases, and more.",
        content: (
            <div className="bg-card border border-border rounded-xl p-5">
                <div className="grid grid-cols-3 gap-2">
                    {["GitHub", "Slack", "Gmail", "Notion", "Jira", "Linear", "Postgres", "MongoDB", "Stripe"].map((tool) => (
                        <div key={tool} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-xs">
                            <span className="w-2 h-2 rounded-full bg-success"></span>
                            {tool}
                        </div>
                    ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 text-center">Powered by Composio • 1000+ integrations</p>
            </div>
        ),
    },
];

export default function DemoPage() {
    const [activeStep, setActiveStep] = useState(0);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Randi
                    </Link>
                    <Link
                        href="/login"
                        className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold transition-all"
                    >
                        Get Started
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-3">How Randi Works</h1>
                    <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                        From sign-in to AI-powered conversations — see the full flow in action.
                    </p>
                </div>

                {/* Step Navigator */}
                <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
                    {demoSteps.map((step, i) => (
                        <button
                            key={step.title}
                            onClick={() => setActiveStep(i)}
                            className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${i === activeStep
                                    ? "bg-primary text-white"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                }`}
                        >
                            Step {i + 1}
                        </button>
                    ))}
                </div>

                {/* Active Step */}
                <div className="space-y-4">
                    <div>
                        <h2 className="text-2xl font-bold">{demoSteps[activeStep].title}</h2>
                        <p className="text-muted-foreground mt-1">{demoSteps[activeStep].description}</p>
                    </div>
                    <div className="transition-all duration-300">{demoSteps[activeStep].content}</div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8">
                    <button
                        onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                        disabled={activeStep === 0}
                        className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        ← Previous
                    </button>
                    {activeStep < demoSteps.length - 1 ? (
                        <button
                            onClick={() => setActiveStep(activeStep + 1)}
                            className="px-6 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-all"
                        >
                            Next Step →
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            className="px-6 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-all"
                        >
                            Start Using Randi →
                        </Link>
                    )}
                </div>
            </main>
        </div>
    );
}
