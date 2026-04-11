import fp from 'fastify-plugin';
import fastifyEnv from '@fastify/env';
import type { FastifyInstance } from 'fastify';

const schema = {
  type: 'object' as const,
  required: ['PORT', 'HOST'],
  properties: {
    PORT: { type: 'number' as const, default: 3000 },
    HOST: { type: 'string' as const, default: '0.0.0.0' },
    LOG_LEVEL: { type: 'string' as const, default: 'info' },
    POSTHOG_API_KEY: { type: 'string' as const, default: '' },
    POSTHOG_HOST: { type: 'string' as const, default: 'https://us.i.posthog.com' },
  },
};

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: number;
      HOST: string;
      LOG_LEVEL: string;
      POSTHOG_API_KEY: string;
      POSTHOG_HOST: string;
    };
  }
}

export default fp(async (server: FastifyInstance) => {
  await server.register(fastifyEnv, {
    confKey: 'config',
    schema,
    dotenv: true,
  });
});
