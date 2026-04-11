import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';

export default fp(async (server: FastifyInstance) => {
  await server.register(helmet, {
    contentSecurityPolicy: false, // Disable for Swagger UI compatibility
  });
});
