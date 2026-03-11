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
    models: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "o3",
      "o3-mini",
      "o4-mini",
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo",
    ],
    apiKeyPlaceholder: "sk-...",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    baseURL: "https://api.anthropic.com/v1",
    models: [
      "claude-sonnet-4-6",
      "claude-haiku-4-5",
      "claude-opus-4-6",
      "claude-sonnet-4-5",
      "claude-opus-4-5",
      "claude-opus-4-1",
      "claude-sonnet-4-0",
      "claude-opus-4-0",
      "claude-haiku-3-5",
      "claude-sonnet-3-5",
    ],
    apiKeyPlaceholder: "sk-ant-...",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
    ],
    apiKeyPlaceholder: "AIza...",
  },
  {
    id: "moonshot",
    name: "Moonshot / Kimi (Global)",
    baseURL: "https://api.moonshot.ai/v1",
    models: [
      "kimi-k2.5",
      "kimi-k2-0905-Preview",
      "kimi-k2-turbo-preview",
      "moonshot-v1-128k",
      "moonshot-v1-32k",
      "moonshot-v1-8k",
    ],
    apiKeyPlaceholder: "sk-...",
  },
  {
    id: "moonshot-cn",
    name: "Moonshot / Kimi (China)",
    baseURL: "https://api.moonshot.cn/v1",
    models: [
      "kimi-k2.5",
      "kimi-k2-0905-Preview",
      "kimi-k2-turbo-preview",
      "moonshot-v1-128k",
      "moonshot-v1-32k",
      "moonshot-v1-8k",
    ],
    apiKeyPlaceholder: "sk-...",
  },
  {
    id: "minimax",
    name: "MiniMax",
    baseURL: "https://api.minimax.io/v1",
    models: [
      "MiniMax-M2.5",
      "MiniMax-M2.5-highspeed",
      "MiniMax-M2.1",
      "MiniMax-M2.1-highspeed",
    ],
    apiKeyPlaceholder: "eyJ...",
  },
  {
    id: "groq",
    name: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
      "llama-3.2-90b-vision-preview",
      "llama-3.2-11b-vision-preview",
      "llama-3.2-3b-preview",
      "llama-3.2-1b-preview",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
      "qwen-qwq-32b",
      "deepseek-r1-distill-llama-70b",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "meta-llama/llama-4-maverick-17b-128e-instruct",
    ],
    apiKeyPlaceholder: "gsk_...",
  },
  {
    id: "together",
    name: "Together",
    baseURL: "https://api.together.xyz/v1",
    models: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
      "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",
      "mistralai/Mixtral-8x22B-Instruct-v0.1",
      "mistralai/Mistral-7B-Instruct-v0.3",
      "Qwen/Qwen2.5-72B-Instruct-Turbo",
      "Qwen/QwQ-32B",
      "deepseek-ai/DeepSeek-R1",
      "deepseek-ai/DeepSeek-V3",
      "google/gemma-2-27b-it",
    ],
    apiKeyPlaceholder: "...",
  },
  {
    id: "mistral",
    name: "Mistral",
    baseURL: "https://api.mistral.ai/v1",
    models: [
      "mistral-large-latest",
      "mistral-medium-latest",
      "mistral-small-latest",
      "codestral-latest",
      "pixtral-large-latest",
      "open-mistral-nemo",
      "open-mixtral-8x22b",
      "ministral-8b-latest",
      "ministral-3b-latest",
    ],
    apiKeyPlaceholder: "...",
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    baseURL: "https://api.x.ai/v1",
    models: [
      "grok-3",
      "grok-3-fast",
      "grok-3-mini",
      "grok-3-mini-fast",
      "grok-2",
    ],
    apiKeyPlaceholder: "xai-...",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    baseURL: "https://api.perplexity.ai",
    models: [
      "sonar-pro",
      "sonar",
      "sonar-reasoning-pro",
      "sonar-reasoning",
      "r1-1776",
    ],
    apiKeyPlaceholder: "pplx-...",
  },
  {
    id: "cohere",
    name: "Cohere",
    baseURL: "https://api.cohere.com/v2",
    models: [
      "command-a-03-2025",
      "command-r-plus-08-2024",
      "command-r-08-2024",
      "command-r7b-12-2024",
    ],
    apiKeyPlaceholder: "...",
  },
  // --- Local Providers ---
  {
    id: "ollama",
    name: "Ollama (Local)",
    baseURL: "http://localhost:11434/v1",
    models: [
      "llama3.3",
      "llama3.2",
      "llama3.1",
      "deepseek-r1:14b",
      "deepseek-r1:32b",
      "deepseek-r1:70b",
      "qwen2.5:14b",
      "qwen2.5:32b",
      "qwen2.5:72b",
      "qwen2.5-coder:14b",
      "qwen2.5-coder:32b",
      "qwq",
      "phi4",
      "gemma2",
      "gemma2:27b",
      "mistral",
      "mixtral",
      "codellama",
      "command-r",
      "starcoder2",
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
    models: [
      "deepseek-chat",
      "deepseek-reasoner",
    ],
    apiKeyPlaceholder: "sk-...",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    baseURL: "https://api.cerebras.ai/v1",
    models: [
      "llama-3.3-70b",
      "llama-3.1-8b",
      "llama-3.1-70b",
    ],
    apiKeyPlaceholder: "csk-...",
  },
  {
    id: "sambanova",
    name: "SambaNova",
    baseURL: "https://api.sambanova.ai/v1",
    models: [
      "Meta-Llama-3.3-70B-Instruct",
      "Meta-Llama-3.1-405B-Instruct",
      "Meta-Llama-3.1-70B-Instruct",
      "Meta-Llama-3.1-8B-Instruct",
      "DeepSeek-R1-Distill-Llama-70B",
      "Qwen2.5-72B-Instruct",
    ],
    apiKeyPlaceholder: "...",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    models: [
      "openai/gpt-4o",
      "anthropic/claude-sonnet-4",
      "google/gemini-2.5-pro",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-r1",
      "mistralai/mistral-large",
      "x-ai/grok-3",
      "qwen/qwq-32b",
    ],
    apiKeyPlaceholder: "sk-or-...",
  },
  {
    id: "fireworks",
    name: "Fireworks",
    baseURL: "https://api.fireworks.ai/inference/v1",
    models: [
      "accounts/fireworks/models/llama-v3p3-70b-instruct",
      "accounts/fireworks/models/llama-v3p1-405b-instruct",
      "accounts/fireworks/models/qwen2p5-72b-instruct",
      "accounts/fireworks/models/deepseek-r1",
      "accounts/fireworks/models/deepseek-v3",
    ],
    apiKeyPlaceholder: "fw_...",
  },
];

// --- Server-side baseURL validation (SSRF prevention) ---

const ALLOWED_HOSTS = new Set(
  PROVIDER_PRESETS.map((p) => {
    try {
      return new URL(p.baseURL).hostname;
    } catch {
      return "";
    }
  }).filter(Boolean)
);

const PRIVATE_IP_RE =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.)/;

/**
 * Check if an IP address is private/internal (RFC1918, loopback, link-local, etc.)
 */
function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RE.test(ip)
    || ip === "::1" || ip === "[::1]"
    || ip === "0.0.0.0"
    || ip.startsWith("fc") || ip.startsWith("fd") // IPv6 ULA
    || ip.startsWith("fe80"); // IPv6 link-local
}

/**
 * Validate that a provider baseURL is safe for server-side requests.
 * Returns null if valid, or an error message string if blocked.
 */
export function validateProviderBaseURL(baseURL: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(baseURL);
  } catch {
    return "Invalid provider URL";
  }

  const host = parsed.hostname;

  // Allow known local providers on localhost
  if (host === "localhost" || host === "127.0.0.1") {
    return null; // local providers are user-controlled
  }

  // Block private/internal IPs
  if (isPrivateIP(host)) {
    return "Private network addresses are not allowed";
  }

  // Block cloud metadata endpoints
  if (host === "metadata.google.internal" || host === "169.254.169.254") {
    return "Metadata endpoints are not allowed";
  }

  // Allow known provider hosts
  if (ALLOWED_HOSTS.has(host)) {
    return null;
  }

  // Require HTTPS for custom endpoints
  if (parsed.protocol !== "https:") {
    return "Only HTTPS URLs are allowed for remote providers";
  }

  // Block custom hosts that look like internal services
  if (host.endsWith(".internal") || host.endsWith(".local") || !host.includes(".")) {
    return "Internal hostnames are not allowed";
  }

  return null;
}

/**
 * Resolve a hostname and verify none of its addresses are private.
 * Call this at request time (after validateProviderBaseURL passes) to catch
 * DNS rebinding attacks (e.g. 127.0.0.1.nip.io, attacker-controlled DNS).
 * Returns null if safe, or an error message if blocked.
 */
export async function resolveAndValidateHost(baseURL: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(baseURL);
  } catch {
    return "Invalid provider URL";
  }

  const host = parsed.hostname;

  // Skip DNS check for known provider hosts and localhost
  if (ALLOWED_HOSTS.has(host) || host === "localhost" || host === "127.0.0.1") {
    return null;
  }

  try {
    const dns = await import("dns");
    const { resolve4, resolve6 } = dns.promises;

    // Check both A and AAAA records
    const [v4Result, v6Result] = await Promise.allSettled([
      resolve4(host),
      resolve6(host),
    ]);

    const addresses: string[] = [];
    if (v4Result.status === "fulfilled") addresses.push(...v4Result.value);
    if (v6Result.status === "fulfilled") addresses.push(...v6Result.value);

    // If DNS returned no records at all, block
    if (addresses.length === 0) {
      return "Could not resolve provider hostname";
    }

    for (const addr of addresses) {
      if (isPrivateIP(addr)) {
        return "Provider hostname resolves to a private network address";
      }
    }
  } catch {
    // DNS resolution failed — block as a precaution
    return "Could not resolve provider hostname";
  }

  return null;
}

const STORAGE_KEY = "noctivault-ai-settings";

/** Clear all noctivault localStorage keys. Call on sign-out to prevent cross-user leakage. */
export function clearUserLocalStorage(): void {
  if (typeof window === "undefined") return;
  const keys = Object.keys(localStorage).filter((k) => k.startsWith("noctivault-"));
  for (const key of keys) {
    localStorage.removeItem(key);
  }
}

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

/**
 * Strip API keys from AI settings before syncing to cloud.
 * Keys stay in localStorage only and never hit the server.
 */
function stripApiKeys(aiSettings: AISettings): AISettings {
  return {
    ...aiSettings,
    providers: aiSettings.providers.map((p) => ({
      ...p,
      apiKey: "",
    })),
  };
}

/** Push current localStorage settings to cloud (fire-and-forget) */
export async function syncSettingsToCloud(): Promise<void> {
  try {
    const settings: CloudSettings = {};

    const ai = localStorage.getItem("noctivault-ai-settings");
    if (ai) settings.aiSettings = stripApiKeys(JSON.parse(ai));

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

    // Also sync encrypted provider API keys (server-side encryption)
    if (ai) {
      const parsed: AISettings = JSON.parse(ai);
      const keys: Record<string, string> = {};
      for (const p of parsed.providers) {
        if (p.apiKey) keys[p.id] = p.apiKey;
      }
      if (Object.keys(keys).length > 0) {
        await fetch("/api/settings/keys", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys }),
        }).catch(() => {}); // best-effort
      }
    }
  } catch {
    // fail silently — cloud sync is best-effort
  }
}

/** Load cloud settings and merge into localStorage (cloud fills gaps, doesn't overwrite) */
export async function loadCloudSettings(): Promise<void> {
  try {
    // Fetch settings and encrypted keys in parallel
    const [settingsRes, keysRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/settings/keys").catch(() => null),
    ]);

    const { settings } = settingsRes.ok
      ? ((await settingsRes.json()) as { settings: CloudSettings | null })
      : { settings: null };

    // Decrypt server-side provider keys
    const serverKeys: Record<string, string> =
      keysRes && keysRes.ok ? (await keysRes.json()).keys || {} : {};

    // Merge cloud AI settings with local API keys + server-side keys
    if (settings?.aiSettings) {
      const localRaw = localStorage.getItem("noctivault-ai-settings");
      if (!localRaw) {
        // No local settings — use cloud config and restore server-side keys
        const restored: AISettings = {
          ...settings.aiSettings,
          providers: settings.aiSettings.providers.map((p) => ({
            ...p,
            apiKey: serverKeys[p.id] || p.apiKey,
          })),
        };
        localStorage.setItem("noctivault-ai-settings", JSON.stringify(restored));
      } else {
        // Merge: prefer local keys, fall back to server-side keys, then cloud (empty)
        const local: AISettings = JSON.parse(localRaw);
        const localKeyMap = new Map(local.providers.map((p) => [p.id, p.apiKey]));
        const merged: AISettings = {
          ...settings.aiSettings,
          providers: settings.aiSettings.providers.map((p) => ({
            ...p,
            apiKey: localKeyMap.get(p.id) || serverKeys[p.id] || p.apiKey,
          })),
        };
        localStorage.setItem("noctivault-ai-settings", JSON.stringify(merged));
      }
    } else if (Object.keys(serverKeys).length > 0) {
      // No cloud AI settings but we have server keys — restore into existing local settings
      const localRaw = localStorage.getItem("noctivault-ai-settings");
      if (localRaw) {
        const local: AISettings = JSON.parse(localRaw);
        const merged: AISettings = {
          ...local,
          providers: local.providers.map((p) => ({
            ...p,
            apiKey: p.apiKey || serverKeys[p.id] || "",
          })),
        };
        localStorage.setItem("noctivault-ai-settings", JSON.stringify(merged));
      }
    }

    if (!settings) return;

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
