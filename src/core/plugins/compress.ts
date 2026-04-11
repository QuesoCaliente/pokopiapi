import fp from 'fastify-plugin';
import compress from '@fastify/compress';
import type { FastifyInstance } from 'fastify';

export default fp(async (server: FastifyInstance) => {
  await server.register(compress, {
    global: true,
  });
});
