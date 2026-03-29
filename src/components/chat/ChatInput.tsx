"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    initialValue?: string;
}

export function ChatInput({ onSend, disabled, initialValue = "" }: ChatInputProps) {
    const [input, setInput] = useState(initialValue);
    const [isListening, setIsListening] = useState(false);
    const [supportsVoice, setSupportsVoice] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);
    const helperId = useId();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                setSupportsVoice(true);

                recognitionRef.current.onresult = (event: any) => {
                    let finalTranscript = "";

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }

                    if (finalTranscript) {
                        setInput(prev => {
                            const current = prev.trim();
                            return current ? `${current} ${finalTranscript}` : finalTranscript;
                        });
                    }

                    if (textareaRef.current) {
                        textareaRef.current.style.height = "auto";
                        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                    }
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error("Speech recognition error:", event.error);
                    setIsListening(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                    textareaRef.current?.focus();
                };
            }
        }
    }, []);

    useEffect(() => {
        if (!initialValue) return;

        setInput((current) => current.trim().length > 0 ? current : initialValue);

        requestAnimationFrame(() => {
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }
        });
    }, [initialValue]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

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

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        // Auto-resize
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    return (
        <div className="space-y-2">
            <div className={`flex items-end gap-2 bg-zinc-900 border-2 rounded-2xl px-3 py-2 transition-all duration-150 ${
                isListening
                    ? 'border-primary shadow-[0_0_20px_rgba(109,40,217,0.25)] ring-1 ring-primary/30'
                    : 'border-zinc-600 hover:border-zinc-500 focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/15'
            }`}>
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? "Listening…" : "Ask Randi anything…"}
                    rows={1}
                    disabled={disabled}
                    aria-label="Message Randi"
                    aria-describedby={helperId}
                    className={`flex-1 bg-transparent border-none focus:ring-0 resize-none py-1.5 px-1 text-sm leading-relaxed max-h-32 scrollbar-thin overflow-y-auto placeholder:text-zinc-500 ${
                        isListening ? "text-primary/80" : "text-foreground"
                    }`}
                />
                <div className="flex items-center gap-1 pb-1 shrink-0">
                    {supportsVoice && (
                        <button
                            type="button"
                            onClick={toggleListening}
                            disabled={disabled}
                            aria-label={isListening ? "Stop voice input" : "Start voice input"}
                            aria-pressed={isListening}
                            title={isListening ? "Stop voice input" : "Start voice input"}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                                isListening
                                    ? "text-primary bg-primary/10 animate-pulse"
                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={!input.trim() || disabled}
                        aria-label="Send message"
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                            !input.trim() || disabled
                                ? "text-zinc-600 bg-zinc-800 cursor-not-allowed"
                                : "text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
            <p id={helperId} className="px-1 text-xs text-zinc-600">
                Enter to send · Shift+Enter for new line
            </p>
        </div>
    );
}
