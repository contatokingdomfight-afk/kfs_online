import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value ?? "";
    if (message.includes("Failed to parse body as FormData")) {
      return null;
    }
    return event;
  },
});
