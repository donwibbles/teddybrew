import * as Sentry from "@sentry/nextjs";

type SentryLayer = "server-action" | "api-route";

interface CaptureOptions {
  layer?: SentryLayer;
  extra?: Record<string, unknown>;
}

/**
 * Primary catch blocks — server action and API route errors.
 * Severity: "error"
 */
export function captureServerError(
  action: string,
  error: unknown,
  options?: CaptureOptions
) {
  Sentry.captureException(error, {
    level: "error",
    tags: {
      action,
      layer: options?.layer ?? "server-action",
    },
    extra: options?.extra,
  });
}

/**
 * Fire-and-forget failures — notifications, Ably publishes, moderation logs.
 * Severity: "log"
 */
export function captureFireAndForgetError(
  action: string,
  error: unknown,
  extra?: Record<string, unknown>
) {
  Sentry.captureException(error, {
    level: "log",
    tags: {
      action,
      layer: "server-action",
    },
    extra,
  });
}

/**
 * External service failures — Resend API, B2 storage, etc.
 * Severity: "warning"
 */
export function captureExternalServiceError(
  action: string,
  error: unknown,
  extra?: Record<string, unknown>
) {
  Sentry.captureException(error, {
    level: "warning",
    tags: {
      action,
      layer: "server-action",
    },
    extra,
  });
}
