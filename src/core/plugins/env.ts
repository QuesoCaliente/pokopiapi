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
  },
};

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: number;
      HOST: string;
      LOG_LEVEL: string;
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
