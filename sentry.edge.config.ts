import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring - lower for edge
  tracesSampleRate: 0.05,

  // Set environment
  environment: process.env.NODE_ENV,

  // Filter out expected errors
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Don't send rate limit errors
    if (error instanceof Error && error.message.includes("rate limit")) {
      return null;
    }

    return event;
  },
});
