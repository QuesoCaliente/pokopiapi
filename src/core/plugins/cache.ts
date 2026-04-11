import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export default fp(async (server: FastifyInstance) => {
  server.addHook('onSend', async (request, reply) => {
    // Skip cache for non-GET requests
    if (request.method !== 'GET') return;

    // Skip if already has cache headers
    if (reply.getHeader('cache-control')) return;

    // Static data - aggressive caching (24h public, 7d stale)
    if (request.url.startsWith('/api/')) {
      reply.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    }
  });
});
