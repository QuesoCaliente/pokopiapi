import { PostHog } from 'posthog-node';
import type { FastifyRequest } from 'fastify';

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

export function trackEvent(request: FastifyRequest, event: string, properties?: Record<string, unknown>) {
  const distinctId =
    (request.headers['x-posthog-distinct-id'] as string | undefined) ?? 'anonymous';
  const origin = request.headers.origin ?? request.headers.referer ?? 'unknown';

  posthog.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      $referrer: origin,
      origin,
    },
  });
}

process.on('SIGINT', async () => {
  await posthog.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await posthog.shutdown();
  process.exit(0);
});
