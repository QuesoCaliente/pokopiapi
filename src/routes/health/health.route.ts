import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from './health.schema.js';

export default async function healthRoutes(server: FastifyInstance) {
  server.get<{ Reply: HealthResponse }>(
    '/health',
    {
      schema: {
        tags: ['Health'],
        description: 'Health check endpoint',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    },
  );
}
