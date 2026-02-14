"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (input.trim() && !disabled) {
            onSend(input);
            setInput("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        // Auto-resize
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    return (
        <div className="flex items-end gap-2 bg-background/50 border border-border rounded-xl p-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <textarea
                ref={textareaRef}
                value={input}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                disabled={disabled}
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 px-3 text-sm max-h-32 scrollbar-thin overflow-y-auto"
            />
            <button
                onClick={handleSend}
                disabled={!input.trim() || disabled}
                className={`p-2 rounded-lg transition-all ${!input.trim() || disabled
                        ? "text-muted-foreground bg-transparent"
                        : "text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                    }`}
            >
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                </svg>
            </button>
        </div>
    );
}
