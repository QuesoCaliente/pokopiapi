import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

export default fp(async (server: FastifyInstance) => {
  await server.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Pokopia API',
        description: 'Public API for the Pokopia Pokedex. Rate limited to 100 requests/minute.',
        version: '1.0.0',
      },
      servers: [
        { url: '/api/v1', description: 'API v1' },
      ],
    },
  });

  await server.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });
});
