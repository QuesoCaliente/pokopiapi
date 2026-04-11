import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

export default fp(async (server: FastifyInstance) => {
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.headers['x-api-key'] as string || request.ip;
    },
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Max ${context.max} requests per ${context.after}. Try again later.`,
    }),
  });
});
