import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring
  tracesSampleRate: 0.1, // Capture 10% of transactions
  profilesSampleRate: 0.1, // Profile 10% of transactions for performance scores

  // Session replay for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Set environment
  environment: process.env.NODE_ENV,

  // Filter out non-error events
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Don't send rate limit errors as they're expected behavior
    if (error instanceof Error && error.message.includes("rate limit")) {
      return null;
    }

    return event;
  },

  // Tag Ably-related errors for easier filtering
  beforeSendTransaction(event) {
    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
