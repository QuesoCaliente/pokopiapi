import { PostHog } from 'posthog-node';

const apiKey = process.env.POSTHOG_API_KEY;

const noop = {
  capture: () => {},
  captureException: () => {},
  shutdown: async () => {},
} as unknown as PostHog;

export const posthog = apiKey
  ? new PostHog(apiKey, {
      host: process.env.POSTHOG_HOST,
      enableExceptionAutocapture: true,
    })
  : noop;

process.on('SIGINT', async () => {
  await posthog.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await posthog.shutdown();
  process.exit(0);
});
