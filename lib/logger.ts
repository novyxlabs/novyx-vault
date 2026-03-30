import { randomUUID } from "crypto";

export interface LogContext {
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: unknown;
}

function hashUserId(userId: string): string {
  // Simple hash for privacy — don't log raw user IDs
  return userId.slice(0, 8) + "...";
}

function formatLog(level: string, message: string, ctx?: LogContext): string {
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };
  if (ctx) {
    if (ctx.userId) ctx.userId = hashUserId(ctx.userId);
    Object.assign(entry, ctx);
  }
  return JSON.stringify(entry);
}

export const logger = {
  info: (message: string, ctx?: LogContext) => console.log(formatLog("info", message, ctx)),
  warn: (message: string, ctx?: LogContext) => console.warn(formatLog("warn", message, ctx)),
  error: (message: string, ctx?: LogContext) => console.error(formatLog("error", message, ctx)),

  /** Generate a request ID for correlation */
  requestId: () => randomUUID().slice(0, 8),

  /** Log slow requests (>1s) and all 5xx responses */
  apiResult(ctx: LogContext) {
    if (ctx.statusCode && ctx.statusCode >= 500) {
      console.error(formatLog("error", `API 5xx: ${ctx.route}`, ctx));
    } else if (ctx.duration && ctx.duration > 1000) {
      console.warn(formatLog("warn", `Slow request: ${ctx.route} (${ctx.duration}ms)`, ctx));
    }
  },
};
