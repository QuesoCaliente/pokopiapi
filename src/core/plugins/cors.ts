import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

export default fp(async (server: FastifyInstance) => {
  await server.register(fastifyCors, {
    origin: true,
  });
});
