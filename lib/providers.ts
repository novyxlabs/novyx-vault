export interface ProviderPreset {
  id: string;
  name: string;
  baseURL: string;
  models: string[];
  apiKeyPlaceholder: string;
  isLocal?: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

export interface AISettings {
  providers: ProviderConfig[];
  activeProviderId: string | null;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "o3-mini"],
    apiKeyPlaceholder: "sk-...",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    baseURL: "https://api.anthropic.com/v1",
    models: [
      "claude-opus-4-6",
      "claude-sonnet-4-6",
      "claude-haiku-4-5",
      "claude-opus-4-5",
      "claude-sonnet-4-5",
      "claude-opus-4-1",
      "claude-sonnet-4-0",
      "claude-opus-4-0",
    ],
    apiKeyPlaceholder: "sk-ant-...",
  },
  {
    id: "moonshot",
    name: "Moonshot / Kimi (Global)",
    baseURL: "https://api.moonshot.ai/v1",
    models: ["kimi-k2.5", "kimi-k2-0905-Preview", "kimi-k2-turbo-preview", "moonshot-v1-128k", "moonshot-v1-32k"],
    apiKeyPlaceholder: "sk-...",
  },
  {
    id: "moonshot-cn",
    name: "Moonshot / Kimi (China)",
    baseURL: "https://api.moonshot.cn/v1",
    models: ["kimi-k2.5", "kimi-k2-0905-Preview", "kimi-k2-turbo-preview", "moonshot-v1-128k", "moonshot-v1-32k"],
    apiKeyPlaceholder: "sk-...",
  },
  {
    id: "minimax",
    name: "MiniMax",
    baseURL: "https://api.minimax.io/v1",
    models: ["MiniMax-M2.5", "MiniMax-M2.5-highspeed", "MiniMax-M2.1", "MiniMax-M2.1-highspeed"],
    apiKeyPlaceholder: "eyJ...",
  },
  {
    id: "groq",
    name: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "llama-3.1-8b-instant"],
    apiKeyPlaceholder: "gsk_...",
  },
  {
    id: "together",
    name: "Together",
    baseURL: "https://api.together.xyz/v1",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "mistralai/Mixtral-8x22B-Instruct-v0.1"],
    apiKeyPlaceholder: "...",
  },
  {
    id: "mistral",
    name: "Mistral",
    baseURL: "https://api.mistral.ai/v1",
    models: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
    apiKeyPlaceholder: "...",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-2.0-flash", "gemini-2.5-pro"],
    apiKeyPlaceholder: "AIza...",
  },
  // --- Local Providers ---
  {
    id: "ollama",
    name: "Ollama (Local)",
    baseURL: "http://localhost:11434/v1",
    models: [
      "llama3.3",
      "deepseek-r1:14b",
      "deepseek-r1:32b",
      "qwen2.5:14b",
      "qwen2.5:32b",
      "qwq",
      "phi4",
      "gemma2",
      "mistral",
      "codellama",
    ],
    apiKeyPlaceholder: "Not required",
    isLocal: true,
  },
  {
    id: "lmstudio",
    name: "LM Studio (Local)",
    baseURL: "http://localhost:1234/v1",
    models: [
      "loaded-model",
    ],
    apiKeyPlaceholder: "Not required",
    isLocal: true,
  },
  // --- Free / Affordable Cloud ---
  {
    id: "deepseek",
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    apiKeyPlaceholder: "sk-...",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    baseURL: "https://api.cerebras.ai/v1",
    models: ["llama-3.3-70b", "llama-3.1-8b"],
    apiKeyPlaceholder: "csk-...",
  },
  {
    id: "sambanova",
    name: "SambaNova",
    baseURL: "https://api.sambanova.ai/v1",
    models: ["Meta-Llama-3.3-70B-Instruct", "DeepSeek-R1-Distill-Llama-70B"],
    apiKeyPlaceholder: "...",
  },
];

const STORAGE_KEY = "noctivault-ai-settings";

export function loadSettings(): AISettings {
  if (typeof window === "undefined") {
    return { providers: [], activeProviderId: null };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore parse errors
  }
  return { providers: [], activeProviderId: null };
}

export function saveSettings(settings: AISettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getActiveProvider(settings: AISettings): ProviderConfig | null {
  if (!settings.activeProviderId) return null;
  return settings.providers.find((p) => p.id === settings.activeProviderId) || null;
}

// --- Cloud settings sync ---

export interface CloudSettings {
  aiSettings?: AISettings;
  pinnedNotes?: string[];
  theme?: string;
  accent?: { hue: number; saturation: number };
  sort?: string;
}

const CLOUD_SETTINGS_KEYS = [
  "noctivault-ai-settings",
  "noctivault-pinned",
  "noctivault-theme",
  "noctivault-accent",
  "noctivault-sort",
] as const;

/** Push current localStorage settings to cloud (fire-and-forget) */
export async function syncSettingsToCloud(): Promise<void> {
  try {
    const settings: CloudSettings = {};

    const ai = localStorage.getItem("noctivault-ai-settings");
    if (ai) settings.aiSettings = JSON.parse(ai);

    const pinned = localStorage.getItem("noctivault-pinned");
    if (pinned) settings.pinnedNotes = JSON.parse(pinned);

    const theme = localStorage.getItem("noctivault-theme");
    if (theme) settings.theme = theme;

    const accent = localStorage.getItem("noctivault-accent");
    if (accent) settings.accent = JSON.parse(accent);

    const sort = localStorage.getItem("noctivault-sort");
    if (sort) settings.sort = sort;

    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
  } catch {
    // fail silently — cloud sync is best-effort
  }
}

/** Load cloud settings and merge into localStorage (cloud fills gaps, doesn't overwrite) */
export async function loadCloudSettings(): Promise<void> {
  try {
    const res = await fetch("/api/settings");
    if (!res.ok) return;

    const { settings } = (await res.json()) as { settings: CloudSettings | null };
    if (!settings) return;

    // Only fill in keys that are missing locally
    if (settings.aiSettings && !localStorage.getItem("noctivault-ai-settings")) {
      localStorage.setItem("noctivault-ai-settings", JSON.stringify(settings.aiSettings));
    }

    if (settings.pinnedNotes && !localStorage.getItem("noctivault-pinned")) {
      localStorage.setItem("noctivault-pinned", JSON.stringify(settings.pinnedNotes));
    }

    if (settings.theme && !localStorage.getItem("noctivault-theme")) {
      localStorage.setItem("noctivault-theme", settings.theme);
    }

    if (settings.accent && !localStorage.getItem("noctivault-accent")) {
      localStorage.setItem("noctivault-accent", JSON.stringify(settings.accent));
    }

    if (settings.sort && !localStorage.getItem("noctivault-sort")) {
      localStorage.setItem("noctivault-sort", settings.sort);
    }
  } catch {
    // fail silently
  }
}
