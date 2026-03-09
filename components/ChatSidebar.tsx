"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Settings, Bot, User, ChevronDown, FileDown, FilePlus, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLinks from "@/lib/remarkWikiLinks";
import { loadSettings, saveSettings, getActiveProvider, PROVIDER_PRESETS } from "@/lib/providers";
import type { ComponentPropsWithoutRef } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  notePath: string | null;
  noteContent: string;
  onNavigateWikiLink?: (linkText: string) => void;
  onOpenSettings: () => void;
  onInsertToNote?: (content: string) => void;
  onCreateNote?: (content: string) => void;
}

export default function ChatSidebar({
  isOpen,
  onToggle,
  notePath,
  noteContent,
  onNavigateWikiLink,
  onOpenSettings,
  onInsertToNote,
  onCreateNote,
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [currentSettings, setCurrentSettings] = useState(() => loadSettings());
  const [memoriesRecalled, setMemoriesRecalled] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
      // Load memory-based suggestions
      fetch("/api/memory/context")
        .then((r) => r.json())
        .then((ctx) => {
          const prompts: string[] = [];
          if (ctx.recent && ctx.recent.length > 0) {
            const topMemory = ctx.recent[0].observation;
            if (topMemory.length >= 15) {
              const preview = topMemory.length > 40 ? topMemory.slice(0, 40) + "..." : topMemory;
              prompts.push(`Continue: "${preview}"`);
            }
          }
          prompts.push("What do you remember about me?");
          if (notePath) {
            prompts.push("Summarize this note");
          }
          setSuggestions(prompts);
        })
        .catch(() => {
          setSuggestions(["What do you remember about me?"]);
        });
    }
  }, [isOpen, notePath]);

  // Refresh settings when model picker opens or when chat panel opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSettings(loadSettings());
    }
  }, [isOpen]);

  useEffect(() => {
    if (showModelPicker) {
      setCurrentSettings(loadSettings());
    }
  }, [showModelPicker]);

  useEffect(() => {
    if (!showModelPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showModelPicker]);

  const switchModel = (providerId: string, model: string) => {
    const latest = loadSettings();
    const updated = {
      ...latest,
      activeProviderId: providerId,
      providers: latest.providers.map((p) =>
        p.id === providerId ? { ...p, model } : p
      ),
    };
    saveSettings(updated);
    setCurrentSettings(updated);
    setShowModelPicker(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const settings = loadSettings();
    const provider = getActiveProvider(settings);

    if (!provider) {
      setError("No AI provider configured. Open Settings to add one.");
      return;
    }

    const isLocal = provider.baseURL.includes("localhost") || provider.baseURL.includes("127.0.0.1");
    if (!isLocal && !provider.apiKey) {
      setError("No API key set for " + (provider.name || "this provider") + ". Open Settings to add your key.");
      return;
    }

    setError(null);
    setMemoriesRecalled(0);
    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          noteContext: notePath ? { path: notePath, content: noteContent } : undefined,
          provider: {
            baseURL: provider.baseURL,
            apiKey: provider.apiKey,
            model: provider.model,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed" }));
        setError(errData.error || `Error ${res.status}`);
        setIsStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              setError(parsed.error);
              break;
            }
            if (parsed.meta) {
              if (parsed.meta.memoriesRecalled) {
                setMemoriesRecalled(parsed.meta.memoriesRecalled);
              }
              continue;
            }
            assistantContent += parsed.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantContent };
              return updated;
            });
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Connection failed");
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const activeProvider = getActiveProvider(currentSettings);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-sidebar-bg flex flex-col md:static md:inset-auto md:z-auto md:w-96 md:shrink-0 md:border-l md:border-sidebar-border md:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-accent" />
          <span className="text-sm font-medium">AI Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded text-muted hover:text-foreground transition-colors"
            title="Settings"
          >
            <Settings size={14} />
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded text-muted hover:text-foreground transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Model Switcher */}
      <div className="relative px-4 py-2 border-b border-sidebar-border" ref={modelPickerRef}>
        <button
          onClick={() => setShowModelPicker((prev) => !prev)}
          className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-md bg-card-bg border border-sidebar-border hover:border-accent/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            {activeProvider ? (
              <>
                <div className="text-xs text-muted">{activeProvider.name}</div>
                <div className="text-sm font-mono truncate flex items-center gap-1.5">
                  {activeProvider.model}
                  {!activeProvider.apiKey && !activeProvider.baseURL.includes("localhost") && (
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full font-sans">No key</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted">No model selected</div>
            )}
          </div>
          <ChevronDown size={14} className={`text-muted shrink-0 transition-transform ${showModelPicker ? "rotate-180" : ""}`} />
        </button>

        {showModelPicker && (() => {
          const pickerProviderId = currentSettings.activeProviderId || currentSettings.providers[0]?.id;
          const pickerProvider = currentSettings.providers.find((p) => p.id === pickerProviderId);
          const pickerPreset = pickerProvider ? PROVIDER_PRESETS.find((p) => p.id === pickerProvider.id) : null;
          const pickerModels = pickerProvider
            ? [...new Set([pickerProvider.model, ...(pickerPreset?.models || [])].filter(Boolean))]
            : [];

          return (
            <div className="absolute left-4 right-4 top-full mt-1 bg-card-bg border border-sidebar-border rounded-lg shadow-xl z-50 max-h-72 overflow-hidden flex flex-col">
              {/* Provider tabs */}
              {currentSettings.providers.length > 1 && (
                <div className="flex overflow-x-auto border-b border-sidebar-border bg-sidebar-bg/50 shrink-0 scrollbar-none">
                  {currentSettings.providers.map((provider) => {
                    const isSelected = provider.id === pickerProviderId;
                    return (
                      <button
                        key={provider.id}
                        onClick={() => switchModel(provider.id, provider.model)}
                        className={`px-3 py-1.5 text-xs whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                          isSelected
                            ? "border-accent text-accent font-medium"
                            : "border-transparent text-muted hover:text-foreground"
                        }`}
                      >
                        {provider.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Model list for selected provider */}
              <div className="overflow-y-auto">
                {pickerModels.map((model) => {
                  const isActive = currentSettings.activeProviderId === pickerProviderId && activeProvider?.model === model;
                  return (
                    <button
                      key={model}
                      onClick={() => switchModel(pickerProviderId!, model)}
                      className={`w-full text-left px-3 py-2 text-sm font-mono hover:bg-muted-bg/50 transition-colors ${
                        isActive ? "text-accent bg-accent/10" : "text-foreground"
                      }`}
                    >
                      {model}
                    </button>
                  );
                })}
                {pickerModels.length === 0 && (
                  <div className="px-3 py-4 text-sm text-muted text-center">
                    No models available
                  </div>
                )}
              </div>
              {currentSettings.providers.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted text-center">
                  No providers configured
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted text-sm mt-8">
            <Bot size={32} className="mx-auto mb-3 text-accent/30" />
            <p>Ask me anything about your notes.</p>
            {notePath && (
              <p className="text-xs mt-1">
                I can see your current note: <span className="text-accent">{notePath}</span>
              </p>
            )}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mt-4 px-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                      textareaRef.current?.focus();
                    }}
                    className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-xs text-accent hover:bg-accent/20 transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="shrink-0 w-6 h-6 rounded bg-accent/20 flex items-center justify-center mt-0.5">
                  <Bot size={12} className="text-accent" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-accent text-white"
                    : "bg-card-bg border border-sidebar-border"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="markdown-preview chat-markdown">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkWikiLinks]}
                      components={{
                        a: ({ children, href, ...props }: ComponentPropsWithoutRef<"a">) => {
                          const wikiLink = (props as Record<string, unknown>)["data-wiki-link"] as string | undefined;
                          if (wikiLink && onNavigateWikiLink) {
                            return (
                              <a
                                href="#"
                                className="wiki-link"
                                onClick={(e) => {
                                  e.preventDefault();
                                  onNavigateWikiLink(wikiLink);
                                }}
                              >
                                {children}
                              </a>
                            );
                          }
                          return <a href={href} {...props}>{children}</a>;
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === "user" && (
                <div className="shrink-0 w-6 h-6 rounded bg-muted-bg flex items-center justify-center mt-0.5">
                  <User size={12} className="text-muted" />
                </div>
              )}
            </div>
            {msg.role === "assistant" && msg.content && !(isStreaming && i === messages.length - 1) && (
              <div className="flex gap-2 mt-1 ml-8">
                {onInsertToNote && notePath && (
                  <button
                    onClick={() => onInsertToNote(msg.content)}
                    className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors px-2 py-0.5 rounded hover:bg-muted-bg/50"
                    title="Append to current note"
                  >
                    <FileDown size={12} />
                    Insert to Note
                  </button>
                )}
                {onCreateNote && (
                  <button
                    onClick={() => onCreateNote(msg.content)}
                    className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors px-2 py-0.5 rounded hover:bg-muted-bg/50"
                    title="Create a new note from this response"
                  >
                    <FilePlus size={12} />
                    Create as Note
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {memoriesRecalled > 0 && (
          <div className="flex items-center gap-1.5 ml-8 mb-1">
            <Brain size={12} className="text-accent/70" />
            <span className="text-xs text-accent/70">
              Recalled {memoriesRecalled} {memoriesRecalled === 1 ? "memory" : "memories"}
            </span>
          </div>
        )}

        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex gap-2">
            <div className="shrink-0 w-6 h-6 rounded bg-accent/20 flex items-center justify-center">
              <Bot size={12} className="text-accent" />
            </div>
            <div className="bg-card-bg border border-sidebar-border rounded-lg px-3 py-2">
              <span className="text-sm text-muted animate-pulse">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <span className="text-xs text-red-400 flex-1">{error}</span>
          {(error.includes("Settings") || error.includes("API key") || error.includes("provider")) && (
            <button
              onClick={onOpenSettings}
              className="text-[10px] font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors shrink-0"
            >
              Open Settings
            </button>
          )}
        </div>
      )}

      {/* Input */}
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-sidebar-border">
        {!activeProvider ? (
          <button
            onClick={onOpenSettings}
            className="w-full px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors"
          >
            Configure AI Provider
          </button>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your notes..."
              rows={1}
              className="flex-1 bg-card-bg border border-sidebar-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted outline-none focus:border-accent/50 resize-none"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className="p-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
