import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring
  tracesSampleRate: 0.1, // Capture 10% of transactions
  profilesSampleRate: 0.1, // Profile 10% of transactions for performance scores

  // Set environment
  environment: process.env.NODE_ENV,

  // Filter out expected errors
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Don't send rate limit errors
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        return null;
      }
      // Don't send auth-related expected errors
      if (error.message === "Unauthorized") {
        return null;
      }
    }

    return event;
  },
});
