"use client";

import { useState, useEffect } from "react";
import { X, Gauge, Lock, ArrowUpRight, AlertTriangle } from "lucide-react";

interface UsageData {
  tier: string;
  memories_count: number;
  memories_limit: number;
  api_calls_used: number;
  api_calls_limit: number;
  rollbacks_used: number;
  rollbacks_limit: number;
  billing_reset_date: string | null;
}

interface UsageViewProps {
  isOpen: boolean;
  onClose: () => void;
}

function parseBillingDate(raw: string | null): string {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

function tierLabel(tier: string): string {
  const labels: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    enterprise: "Enterprise",
  };
  return labels[tier] || tier;
}

function tierColor(tier: string): string {
  if (tier === "pro" || tier === "enterprise") return "text-accent";
  if (tier === "starter") return "text-blue-400";
  return "text-muted";
}

function UsageBar({
  label,
  used,
  limit,
  color = "accent",
}: {
  label: string;
  used: number;
  limit: number;
  color?: string;
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isHigh = pct >= 80;
  const isFull = pct >= 100;

  const barColor = isFull
    ? "bg-red-500"
    : isHigh
      ? "bg-amber-400"
      : `bg-${color}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-xs font-mono text-foreground">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted-bg overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{
            width: `${pct}%`,
            backgroundColor:
              isFull
                ? undefined
                : isHigh
                  ? undefined
                  : "var(--accent)",
          }}
        />
      </div>
      {isHigh && !isFull && (
        <div className="flex items-center gap-1 text-[10px] text-amber-400">
          <AlertTriangle size={10} />
          <span>Approaching limit</span>
        </div>
      )}
      {isFull && (
        <div className="flex items-center gap-1 text-[10px] text-red-400">
          <AlertTriangle size={10} />
          <span>Limit reached</span>
        </div>
      )}
    </div>
  );
}

export default function UsageView({ isOpen, onClose }: UsageViewProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [tier, setTier] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rawUsage, setRawUsage] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(false);

    fetch("/api/memory/usage")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const raw = data.usage || {};
        const gating = data.gating;
        const t = gating?.tier || raw.tier || "free";
        setTier(t);
        // Counts are nested objects: { current, used, limit, unlimited }
        const mem = raw.memories || {};
        const api = raw.api_calls || {};
        const rb = raw.rollbacks || {};
        setUsage({
          tier: t,
          memories_count: mem.current ?? mem.used ?? gating?.usage?.memories_count ?? 0,
          memories_limit: mem.unlimited ? 0 : (mem.limit ?? gating?.usage?.memories_limit ?? 0),
          api_calls_used: api.current ?? api.used ?? 0,
          api_calls_limit: api.unlimited ? 0 : (api.limit ?? 0),
          rollbacks_used: rb.current ?? rb.used ?? 0,
          rollbacks_limit: rb.unlimited ? 0 : (rb.limit ?? 0),
          billing_reset_date: raw.resets_at ?? null,
        });
        // Store extra data for display
        setRawUsage(raw);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const isLocked = tier === "free" || tier === "starter";
  const anyHigh =
    usage &&
    ((usage.memories_limit > 0 && usage.memories_count / usage.memories_limit >= 0.8) ||
      (usage.api_calls_limit > 0 && usage.api_calls_used / usage.api_calls_limit >= 0.8));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md mx-4 bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center">
              <Gauge size={14} className="text-accent" />
            </div>
            <h2 className="text-lg font-semibold">Usage & Limits</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-sm text-muted">Failed to load usage data.</p>
              <p className="text-xs text-muted/60 mt-1">Make sure your Novyx API key is configured in Settings.</p>
            </div>
          )}

          {!loading && !error && usage && (
            <div className="relative">
              {/* Plan Badge */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted/50 font-medium mb-1">
                    Current Plan
                  </div>
                  <span className={`text-xl font-bold ${tierColor(tier)}`}>
                    {tierLabel(tier)}
                  </span>
                </div>
                {usage.billing_reset_date && (
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-widest text-muted/50 font-medium mb-1">
                      Resets
                    </div>
                    <span className="text-sm text-foreground">
                      {parseBillingDate(usage.billing_reset_date)}
                    </span>
                  </div>
                )}
              </div>

              {/* Usage Stats */}
              <div className="space-y-4">
                {usage.memories_limit > 0 ? (
                  <UsageBar
                    label="Memories"
                    used={usage.memories_count}
                    limit={usage.memories_limit}
                  />
                ) : usage.memories_count > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">Memories</span>
                      <span className="text-xs font-mono text-foreground">
                        {usage.memories_count.toLocaleString()}
                        <span className="text-muted ml-1">/ unlimited</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted-bg overflow-hidden">
                      <div className="h-full rounded-full w-1/4" style={{ backgroundColor: "var(--accent)" }} />
                    </div>
                  </div>
                ) : null}

                {usage.api_calls_limit > 0 ? (
                  <UsageBar
                    label="API Calls"
                    used={usage.api_calls_used}
                    limit={usage.api_calls_limit}
                  />
                ) : usage.api_calls_used > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">API Calls</span>
                      <span className="text-xs font-mono text-foreground">
                        {usage.api_calls_used.toLocaleString()}
                        <span className="text-muted ml-1">/ unlimited</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted-bg overflow-hidden">
                      <div className="h-full rounded-full w-1/6" style={{ backgroundColor: "var(--accent)" }} />
                    </div>
                  </div>
                ) : null}

                {usage.rollbacks_limit > 0 ? (
                  <UsageBar
                    label="Rollbacks"
                    used={usage.rollbacks_used}
                    limit={usage.rollbacks_limit}
                  />
                ) : usage.rollbacks_used > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">Rollbacks</span>
                      <span className="text-xs font-mono text-foreground">
                        {usage.rollbacks_used.toLocaleString()}
                        <span className="text-muted ml-1">/ unlimited</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted-bg overflow-hidden">
                      <div className="h-full rounded-full w-1/6" style={{ backgroundColor: "var(--accent)" }} />
                    </div>
                  </div>
                ) : null}

                {/* Fallback: show raw data if nothing else rendered */}
                {usage.memories_count === 0 && usage.api_calls_used === 0 && usage.rollbacks_used === 0 && (
                  <div className="rounded-lg border border-sidebar-border bg-card-bg/50 p-4 text-center">
                    <p className="text-sm text-muted">No usage recorded yet.</p>
                    <p className="text-xs text-muted/50 mt-1">Usage will appear as you interact with Novyx Memory.</p>
                  </div>
                )}
              </div>

              {/* Extra stats from raw usage */}
              {rawUsage && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {rawUsage.period && (
                    <div className="rounded-lg border border-sidebar-border bg-card-bg/50 px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-widest text-muted/50 font-medium mb-0.5">Period</div>
                      <span className="text-sm text-foreground">{rawUsage.period}</span>
                    </div>
                  )}
                  {rawUsage.usage_pressure_level && (
                    <div className="rounded-lg border border-sidebar-border bg-card-bg/50 px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-widest text-muted/50 font-medium mb-0.5">Pressure</div>
                      <span className={`text-sm capitalize ${
                        rawUsage.usage_pressure_level === "low" ? "text-green-400" :
                        rawUsage.usage_pressure_level === "medium" ? "text-amber-400" : "text-red-400"
                      }`}>{rawUsage.usage_pressure_level}</span>
                    </div>
                  )}
                  {rawUsage.spend_estimate?.spend_estimate_usd != null && (
                    <div className="rounded-lg border border-sidebar-border bg-card-bg/50 px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-widest text-muted/50 font-medium mb-0.5">Spend</div>
                      <span className="text-sm text-foreground">${rawUsage.spend_estimate.spend_estimate_usd.toFixed(2)}</span>
                    </div>
                  )}
                  {rawUsage.audit_retention_days && (
                    <div className="rounded-lg border border-sidebar-border bg-card-bg/50 px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-widest text-muted/50 font-medium mb-0.5">Audit Retention</div>
                      <span className="text-sm text-foreground">{rawUsage.audit_retention_days} days</span>
                    </div>
                  )}
                </div>
              )}

              {/* Upgrade CTA */}
              {(isLocked || anyHigh) && (
                <div className="mt-6 rounded-lg border border-accent/20 p-4" style={{ background: "linear-gradient(135deg, rgba(var(--accent-rgb, 139,92,246), 0.06) 0%, rgba(var(--accent-rgb, 139,92,246), 0.02) 100%)" }}>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {anyHigh && !isLocked
                      ? "Running low on capacity"
                      : "Unlock full capacity"}
                  </p>
                  <p className="text-xs text-muted mb-3">
                    {anyHigh && !isLocked
                      ? "Upgrade your plan to increase limits and avoid interruptions."
                      : "Pro includes unlimited memories, higher API limits, knowledge graph, insights, and audit trail."}
                  </p>
                  <a
                    href="https://novyx.ai/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover transition-colors"
                  >
                    Upgrade to Pro
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              )}

              {/* Pro-gate overlay for detailed breakdown */}
              {isLocked && (
                <div className="mt-5 relative rounded-lg border border-sidebar-border overflow-hidden">
                  {/* Blurred placeholder content */}
                  <div className="p-4 space-y-3 blur-[6px] select-none pointer-events-none" aria-hidden>
                    <div className="h-3 w-32 bg-muted-bg rounded" />
                    <div className="h-2 w-full bg-muted-bg rounded" />
                    <div className="h-2 w-3/4 bg-muted-bg rounded" />
                    <div className="h-3 w-28 bg-muted-bg rounded mt-4" />
                    <div className="h-2 w-full bg-muted-bg rounded" />
                    <div className="h-2 w-2/3 bg-muted-bg rounded" />
                  </div>
                  {/* Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-sidebar-bg/60 backdrop-blur-sm">
                    <Lock size={24} className="text-accent/30 mb-2" />
                    <p className="text-sm font-medium text-foreground">Detailed Breakdown</p>
                    <p className="text-xs text-muted mt-0.5">Available on Pro plan</p>
                    <a
                      href="https://novyx.ai/pricing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 px-4 py-2 bg-accent/15 text-accent rounded-md text-xs hover:bg-accent/25 transition-colors"
                    >
                      Upgrade to Pro →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
