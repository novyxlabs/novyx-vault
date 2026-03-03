"use client";

import { useState } from "react";
import { X, Plus, Trash2, Check, ChevronDown } from "lucide-react";
import {
  PROVIDER_PRESETS,
  loadSettings,
  saveSettings,
  syncSettingsToCloud,
  type AISettings,
  type ProviderConfig,
  type ProviderPreset,
} from "@/lib/providers";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<AISettings>(() => loadSettings());
  const [showPresets, setShowPresets] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(false);

  // Reset state when modal opens (replaces useEffect setState)
  if (isOpen && !prevOpen) {
    setSettings(loadSettings());
    setShowPresets(false);
    setEditingId(null);
  }
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
  }

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="AI Settings"
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
          <h2 className="text-lg font-semibold">AI Settings</h2>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {settings.providers.length === 0 ? (
            <div className="text-center text-muted text-sm py-8">
              <p>No providers configured yet.</p>
              <p className="text-xs mt-1">Add a provider to start using AI chat.</p>
            </div>
          ) : (
            settings.providers.map((provider) => {
              const preset = PROVIDER_PRESETS.find((p) => p.id === provider.id);
              const isEditing = editingId === provider.id;
              const isActive = settings.activeProviderId === provider.id;

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
                      <div>
                        <label className="text-xs text-muted block mb-1">Base URL</label>
                        <input
                          type="text"
                          value={provider.baseURL}
                          onChange={(e) => updateProvider(provider.id, "baseURL", e.target.value)}
                          className="w-full bg-card-bg border border-sidebar-border rounded px-3 py-1.5 text-sm text-foreground font-mono outline-none focus:border-accent/50"
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
                        <input
                          type="text"
                          value={provider.model}
                          onChange={(e) => updateProvider(provider.id, "model", e.target.value)}
                          placeholder="e.g., gpt-4o"
                          list={`models-${provider.id}`}
                          className="w-full bg-card-bg border border-sidebar-border rounded px-3 py-1.5 text-sm text-foreground font-mono outline-none focus:border-accent/50"
                        />
                        {preset && (
                          <datalist id={`models-${provider.id}`}>
                            {preset.models.map((m) => (
                              <option key={m} value={m} />
                            ))}
                          </datalist>
                        )}
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
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-sidebar-border">
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
        </div>
      </div>
    </div>
  );
}
