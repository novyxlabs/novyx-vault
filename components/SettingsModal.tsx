"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, Check, ChevronDown, LogOut, Sparkles, Zap, Globe, Server, Brain, Eye, EyeOff } from "lucide-react";
import ObsidianImport from "./ObsidianImport";
import {
  PROVIDER_PRESETS,
  loadSettings,
  saveSettings,
  syncSettingsToCloud,
  clearUserLocalStorage,
  type AISettings,
  type ProviderConfig,
  type ProviderPreset,
} from "@/lib/providers";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Popular providers shown as cards in the empty state
const FEATURED_IDS = ["openai", "anthropic", "gemini", "xai", "deepseek", "groq"];

const PROVIDER_ICONS: Record<string, { icon: typeof Sparkles; color: string }> = {
  openai: { icon: Sparkles, color: "text-green-400" },
  anthropic: { icon: Sparkles, color: "text-orange-400" },
  gemini: { icon: Globe, color: "text-blue-400" },
  xai: { icon: Zap, color: "text-sky-400" },
  deepseek: { icon: Zap, color: "text-cyan-400" },
  groq: { icon: Zap, color: "text-amber-400" },
  ollama: { icon: Server, color: "text-emerald-400" },
};

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<AISettings>(() => loadSettings());
  const [showPresets, setShowPresets] = useState(false);
  const [showAllProviders, setShowAllProviders] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(false);
  const apiKeyRef = useRef<HTMLInputElement>(null);

  // Novyx key state
  const [novyxMasked, setNovyxMasked] = useState<string | null>(null);
  const [novyxHasKey, setNovyxHasKey] = useState(false);
  const [novyxEditing, setNovyxEditing] = useState(false);
  const [novyxInput, setNovyxInput] = useState("");
  const [novyxShowKey, setNovyxShowKey] = useState(false);
  const [novyxSaving, setNovyxSaving] = useState(false);
  const [novyxStatus, setNovyxStatus] = useState<"idle" | "saved" | "error">("idle");
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestTime, setDigestTime] = useState("08:00");
  const isCloud = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Reset state when modal opens (replaces useEffect setState)
  if (isOpen && !prevOpen) {
    setSettings(loadSettings());
    setShowPresets(false);
    setShowAllProviders(false);
    setEditingId(null);
    setNovyxEditing(false);
    setNovyxInput("");
    setNovyxStatus("idle");
  }
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
  }

  // Fetch Novyx key status when modal opens
  useEffect(() => {
    if (isOpen && isCloud) {
      fetch("/api/auth/novyx-key")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            setNovyxHasKey(data.hasKey);
            setNovyxMasked(data.masked);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, isCloud]);

  // Fetch digest settings when modal opens
  useEffect(() => {
    if (isOpen && isCloud) {
      fetch("/api/digest/settings")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            setDigestEnabled(data.digestEnabled ?? false);
            setDigestTime(data.digestTime ?? "08:00");
          }
        })
        .catch(() => {});
    }
  }, [isOpen, isCloud]);

  // Auto-focus API key input when editing a provider
  useEffect(() => {
    if (editingId) {
      setTimeout(() => apiKeyRef.current?.focus(), 100);
    }
  }, [editingId]);

  const handleSave = (updated: AISettings) => {
    setSettings(updated);
    saveSettings(updated);
    syncSettingsToCloud().catch(() => {});
  };

  const addFromPreset = (preset: ProviderPreset) => {
    // Check if already added
    if (settings.providers.some((p) => p.id === preset.id)) {
      setEditingId(preset.id);
      setShowPresets(false);
      return;
    }

    const newProvider: ProviderConfig = {
      id: preset.id,
      name: preset.name,
      baseURL: preset.baseURL,
      apiKey: "",
      model: preset.models[0],
    };

    const updated: AISettings = {
      providers: [...settings.providers, newProvider],
      activeProviderId: settings.activeProviderId || newProvider.id,
    };
    handleSave(updated);
    setEditingId(newProvider.id);
    setShowPresets(false);
  };

  const addCustom = () => {
    const id = `custom-${Date.now()}`;
    const newProvider: ProviderConfig = {
      id,
      name: "Custom Provider",
      baseURL: "https://",
      apiKey: "",
      model: "",
    };

    const updated: AISettings = {
      providers: [...settings.providers, newProvider],
      activeProviderId: settings.activeProviderId || id,
    };
    handleSave(updated);
    setEditingId(id);
    setShowPresets(false);
  };

  const removeProvider = (id: string) => {
    const updated: AISettings = {
      providers: settings.providers.filter((p) => p.id !== id),
      activeProviderId: settings.activeProviderId === id ? null : settings.activeProviderId,
    };
    if (!updated.activeProviderId && updated.providers.length > 0) {
      updated.activeProviderId = updated.providers[0].id;
    }
    handleSave(updated);
    if (editingId === id) setEditingId(null);
  };

  const updateProvider = (id: string, field: keyof ProviderConfig, value: string) => {
    const updated: AISettings = {
      ...settings,
      providers: settings.providers.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    };
    handleSave(updated);
  };

  const setActive = (id: string) => {
    handleSave({ ...settings, activeProviderId: id });
  };

  const handleNovyxSave = async () => {
    if (!novyxInput.trim() || novyxInput.trim().length < 8) return;
    setNovyxSaving(true);
    setNovyxStatus("idle");
    try {
      const res = await fetch("/api/auth/novyx-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: novyxInput.trim() }),
      });
      if (res.ok) {
        setNovyxStatus("saved");
        setNovyxHasKey(true);
        const masked = novyxInput.trim();
        setNovyxMasked(masked.slice(0, 8) + "..." + masked.slice(-4));
        setNovyxEditing(false);
        setNovyxInput("");
      } else {
        setNovyxStatus("error");
      }
    } catch {
      setNovyxStatus("error");
    } finally {
      setNovyxSaving(false);
    }
  };

  if (!isOpen) return null;

  const hasProviders = settings.providers.length > 0;
  const featuredPresets = PROVIDER_PRESETS.filter((p) => FEATURED_IDS.includes(p.id));
  const otherPresets = PROVIDER_PRESETS.filter((p) => !FEATURED_IDS.includes(p.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          const focusable = e.currentTarget.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
          } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
        }
      }}
    >
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg mx-4 bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sidebar-border">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Novyx Memory Key Section (cloud mode only) */}
          {isCloud && (
            <div className="border border-sidebar-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={16} className="text-purple-400" />
                <span className="text-sm font-medium">Novyx Memory</span>
              </div>

              {!novyxEditing ? (
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted flex items-center gap-2">
                    {novyxHasKey ? (
                      <span className="font-mono">{novyxMasked}</span>
                    ) : (
                      <span>No key configured</span>
                    )}
                    {novyxStatus === "saved" && (
                      <span className="text-green-400">Saved!</span>
                    )}
                  </div>                  <button
                    onClick={() => { setNovyxEditing(true); setNovyxStatus("idle"); }}
                    className="text-xs text-accent hover:text-accent-hover px-2 py-1 rounded hover:bg-accent/5"
                  >
                    {novyxHasKey ? "Change" : "Add Key"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={novyxShowKey ? "text" : "password"}
                      value={novyxInput}
                      onChange={(e) => setNovyxInput(e.target.value)}
                      placeholder="Enter your Novyx API key..."
                      className="w-full bg-card-bg border border-sidebar-border rounded px-3 py-1.5 text-sm text-foreground font-mono outline-none focus:border-accent/50 pr-8"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleNovyxSave(); }}
                    />
                    <button
                      type="button"
                      onClick={() => setNovyxShowKey((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                      tabIndex={-1}
                    >
                      {novyxShowKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleNovyxSave}
                      disabled={novyxSaving || novyxInput.trim().length < 8}
                      className="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-colors"
                    >
                      {novyxSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => { setNovyxEditing(false); setNovyxInput(""); setNovyxStatus("idle"); }}
                      className="px-3 py-1 text-xs text-muted hover:text-foreground rounded hover:bg-muted-bg"
                    >
                      Cancel
                    </button>
                    {novyxStatus === "saved" && (
                      <span className="text-xs text-green-400">Saved</span>
                    )}
                    {novyxStatus === "error" && (
                      <span className="text-xs text-red-400">Failed to save</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted/60 leading-relaxed">
                    Your Novyx key powers the memory system — remembering, recalling, insights, and knowledge graph.
                    Keys are stored securely server-side and never sent to the browser.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AI Providers Header */}
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <span className="text-sm font-medium">AI Providers</span>
          </div>

          {/* Empty State: Provider Picker */}
          {!hasProviders && (
            <div className="space-y-5">
              <div className="text-center">
                <h3 className="text-sm font-medium text-foreground mb-1">
                  Choose your AI provider
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Bring your own API key. One click to set up.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {featuredPresets.map((preset) => {
                  const iconInfo = PROVIDER_ICONS[preset.id];
                  const IconComp = iconInfo?.icon || Sparkles;
                  const iconColor = iconInfo?.color || "text-accent";
                  return (
                    <button
                      key={preset.id}
                      onClick={() => addFromPreset(preset)}
                      className="flex items-center gap-2.5 p-3 rounded-lg border border-sidebar-border bg-card-bg hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
                    >
                      <div className={`w-8 h-8 rounded-lg bg-card-bg border border-sidebar-border flex items-center justify-center shrink-0 group-hover:border-accent/30 transition-colors`}>
                        <IconComp size={14} className={iconColor} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground block truncate">
                          {preset.name}
                        </span>
                        {preset.isLocal ? (
                          <span className="text-[10px] text-green-400">Free / Local</span>
                        ) : (
                          <span className="text-[10px] text-muted">{preset.models[0]}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Show more */}
              {!showAllProviders ? (
                <button
                  onClick={() => setShowAllProviders(true)}
                  className="w-full text-xs text-muted hover:text-foreground transition-colors py-1.5"
                >
                  Show {otherPresets.length} more providers...
                </button>
              ) : (
                <div className="space-y-1.5">
                  {otherPresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => addFromPreset(preset)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-muted-bg/50 transition-colors"
                    >
                      <span className="text-foreground/80">{preset.name}</span>
                      {preset.isLocal && (
                        <span className="text-[10px] text-green-400/80 bg-green-400/10 px-1.5 py-0.5 rounded">FREE</span>
                      )}
                    </button>
                  ))}
                  <button
                    onClick={addCustom}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-accent hover:bg-accent/5 transition-colors"
                  >
                    + Custom (OpenAI-compatible)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Configured Providers */}
          {hasProviders && (
            <>
              {settings.providers.map((provider) => {
                const preset = PROVIDER_PRESETS.find((p) => p.id === provider.id);
                const isEditing = editingId === provider.id;
                const isActive = settings.activeProviderId === provider.id;
                const isReady = preset?.isLocal || !!provider.apiKey;

                return (
                  <div
                    key={provider.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      isActive ? "border-accent/50 bg-accent/5" : "border-sidebar-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActive(provider.id)}
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isActive ? "border-accent bg-accent" : "border-muted"
                          }`}
                          title="Set as active"
                        >
                          {isActive && <Check size={10} className="text-white" />}
                        </button>
                        <span className="text-sm font-medium">{provider.name}</span>
                        {isActive && (
                          <span className="text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded">Active</span>
                        )}
                        {!isReady && !isEditing && (
                          <span className="text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">Needs key</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingId(isEditing ? null : provider.id)}
                          className="text-xs text-muted hover:text-foreground px-2 py-1 rounded hover:bg-muted-bg"
                        >
                          {isEditing ? "Done" : "Edit"}
                        </button>
                        <button
                          onClick={() => removeProvider(provider.id)}
                          className="p-1 rounded text-muted hover:text-red-400 hover:bg-red-400/10"
                          title="Remove"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="space-y-3 mt-3">
                        <div>
                          <label className="text-xs text-muted block mb-1">Name</label>
                          <input
                            type="text"
                            value={provider.name}
                            onChange={(e) => updateProvider(provider.id, "name", e.target.value)}
                            className="w-full bg-card-bg border border-sidebar-border rounded px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent/50"
                          />
                        </div>
                        {preset?.isLocal ? (
                          <div className="px-3 py-1.5 text-xs text-green-400/80 bg-green-400/5 border border-green-400/10 rounded">
                            No API key required — runs on your machine
                          </div>
                        ) : (
                          <div>
                            <label className="text-xs text-muted block mb-1">API Key</label>
                            <input
                              ref={apiKeyRef}
                              type="password"
                              value={provider.apiKey}
                              onChange={(e) => updateProvider(provider.id, "apiKey", e.target.value)}
                              placeholder={preset?.apiKeyPlaceholder || "Enter API key..."}
                              className="w-full bg-card-bg border border-sidebar-border rounded px-3 py-1.5 text-sm text-foreground font-mono outline-none focus:border-accent/50"
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-muted block mb-1">Model</label>
                          {preset && preset.models.length > 0 ? (
                            <select
                              value={provider.model}
                              onChange={(e) => updateProvider(provider.id, "model", e.target.value)}
                              className="w-full bg-card-bg border border-sidebar-border rounded px-3 py-2 text-sm text-foreground font-mono outline-none focus:border-accent/50 appearance-none cursor-pointer"
                              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                            >
                              {preset.models.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={provider.model}
                              onChange={(e) => updateProvider(provider.id, "model", e.target.value)}
                              placeholder="e.g., gpt-4o"
                              className="w-full bg-card-bg border border-sidebar-border rounded px-3 py-1.5 text-sm text-foreground font-mono outline-none focus:border-accent/50"
                            />
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-muted block mb-1">Base URL</label>
                          <input
                            type="text"
                            value={provider.baseURL}
                            onChange={(e) => updateProvider(provider.id, "baseURL", e.target.value)}
                            className="w-full bg-card-bg border border-sidebar-border rounded px-3 py-1.5 text-xs text-muted font-mono outline-none focus:border-accent/50"
                          />
                        </div>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="text-xs text-muted mt-1">
                        {provider.model || "No model selected"} &middot; {preset?.isLocal ? <span className="text-green-400/80">Local</span> : provider.apiKey ? "Key set" : "No key"}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-sidebar-border space-y-3">
          {hasProviders && (
            <div className="relative">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors w-full justify-center"
              >
                <Plus size={14} />
                Add Provider
                <ChevronDown size={14} className={`transition-transform ${showPresets ? "rotate-180" : ""}`} />
              </button>

              {showPresets && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-card-bg border border-sidebar-border rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                  {PROVIDER_PRESETS.map((preset) => {
                    const alreadyAdded = settings.providers.some((p) => p.id === preset.id);
                    return (
                      <button
                        key={preset.id}
                        onClick={() => addFromPreset(preset)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted-bg/50 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span>{preset.name}</span>
                          {preset.isLocal && (
                            <span className="text-[10px] text-green-400/80 bg-green-400/10 px-1.5 py-0.5 rounded">FREE</span>
                          )}
                        </div>
                        {alreadyAdded && (
                          <span className="text-xs text-muted">Added</span>
                        )}
                      </button>
                    );
                  })}
                  <button
                    onClick={addCustom}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted-bg/50 transition-colors border-t border-sidebar-border text-accent"
                  >
                    + Custom (OpenAI-compatible)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Daily Digest Section (cloud mode only) */}
          {isCloud && (
            <div className="border-t border-sidebar-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Daily Digest Email</span>
                </div>
                <button
                  onClick={async () => {
                    const next = !digestEnabled;
                    setDigestEnabled(next);
                    await fetch("/api/digest/settings", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ digestEnabled: next, digestTime }),
                    });
                  }}
                  className={`relative w-9 h-5 rounded-full transition-colors ${digestEnabled ? "bg-accent" : "bg-muted-bg"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${digestEnabled ? "left-[18px]" : "left-0.5"}`} />
                </button>
              </div>
              <p className="text-xs text-muted mb-2">Get yesterday&apos;s note and a memory briefing every morning.</p>
              {digestEnabled && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted">Send at</label>
                  <input
                    type="time"
                    value={digestTime}
                    onChange={async (e) => {
                      setDigestTime(e.target.value);
                      await fetch("/api/digest/settings", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ digestEnabled: true, digestTime: e.target.value }),
                      });
                    }}
                    className="px-2 py-1 text-xs bg-background border border-sidebar-border rounded text-foreground outline-none focus:border-accent"
                  />
                </div>
              )}
            </div>
          )}

          {/* Import Section */}
          <div className="border-t border-sidebar-border pt-4">
            <ObsidianImport />
          </div>

          {/* Sign Out (cloud mode only) */}
          {process.env.NEXT_PUBLIC_SUPABASE_URL && (
            <button
              onClick={async () => {
                clearUserLocalStorage();
                await fetch("/api/auth/signout", { method: "POST" });
                window.location.href = "/login";
              }}              className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors w-full"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
