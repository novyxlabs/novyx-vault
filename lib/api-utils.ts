import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";
import * as Sentry from "@sentry/nextjs";

type Handler = (req: NextRequest) => Promise<Response | NextResponse>;

/**
 * Wrap an API route handler with structured logging and error tracking.
 * Logs slow requests (>1s), 5xx responses, and captures exceptions to Sentry.
 */
export function withMonitoring(route: string, handler: Handler): Handler {
  return async (req: NextRequest) => {
    const requestId = logger.requestId();
    const start = Date.now();

    try {
      const response = await handler(req);
      const duration = Date.now() - start;

      logger.apiResult({
        requestId,
        route,
        method: req.method,
        duration,
        statusCode: response.status,
      });

      return response;
    } catch (err) {
      const duration = Date.now() - start;

      if (err instanceof Response) {
        logger.apiResult({
          requestId,
          route,
          method: req.method,
          duration,
          statusCode: err.status,
        });
        return err;
      }

      Sentry.captureException(err, {
        tags: { route, method: req.method },
        extra: { requestId, duration },
      });

      logger.error("Unhandled API error", {
        requestId,
        route,
        method: req.method,
        duration,
        error: err instanceof Error ? err.message : String(err),
      });

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
