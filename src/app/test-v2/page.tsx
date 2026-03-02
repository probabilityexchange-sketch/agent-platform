"use client";

import { useChat } from "ai/react";
import { useState } from "react";

export default function TestChatV2() {
    const [model, setModel] = useState("meta-llama/llama-3.3-70b-instruct:free");

    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: "/api/chat/v2",
        body: {
            model,
            agentSlug: "randi-lead",
        },
    });

    return (
        <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch font-mono">
            <h1 className="text-xl font-bold mb-4">Chat V2 (Vercel AI SDK)</h1>

            <div className="mb-4">
                <label className="block text-xs mb-1">Model</label>
                <input
                    className="w-full p-2 border border-gray-300 rounded text-sm bg-black text-white"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                />
            </div>

            <div className="space-y-4 mb-4">
                {messages.map(m => (
                    <div key={m.id} className="whitespace-pre-wrap">
                        <span className="font-bold">{m.role === 'user' ? 'User: ' : 'AI: '}</span>
                        {m.content}
                        {m.toolCalls && (
                            <div className="text-[10px] text-blue-400 mt-1">
                                Called Tools: {m.toolCalls.map(tc => tc.function.name).join(', ')}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit}>
                <input
                    className="fixed bottom-0 w-full max-w-md p-4 mb-8 border border-gray-300 rounded shadow-xl bg-black text-white"
                    value={input}
                    placeholder="Say something..."
                    onChange={handleInputChange}
                    disabled={isLoading}
                />
            </form>
        </div>
    );
}
