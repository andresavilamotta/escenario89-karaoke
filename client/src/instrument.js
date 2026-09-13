import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || 'https://c8df2e5a3f82706313e179704e78e088@o4512079889629184.ingest.us.sentry.io/4512079904112640',
  environment: import.meta.env.MODE || 'production',
  release: 'escenario89-karaoke@1.0.0',

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Tracing
  tracesSampleRate: 1.0,
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/escenario89\.andresavila\.org/,
    /^https:\/\/escenario89-karaoke\.vercel\.app/,
  ],

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,
});
