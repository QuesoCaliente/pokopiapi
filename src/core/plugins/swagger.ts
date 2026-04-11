import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

export default fp(async (server: FastifyInstance) => {
  await server.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Pokopia API',
        description:
          'Public API for the Pokopia Pokedex. Rate limited to 100 requests/minute.\n\n' +
          '## Internationalization (i18n)\n\n' +
          'All endpoints support the `Accept-Language` header to get responses in **Spanish** or **English**.\n\n' +
          '| Header value | Language |\n' +
          '|---|---|\n' +
          '| `es` (default) | Spanish |\n' +
          '| `en` | English |\n\n' +
          'Example: `Accept-Language: en`',
        version: '1.0.0',
      },
      servers: [
        { url: '/api/v1', description: 'API v1' },
      ],
      components: {
        parameters: {
          AcceptLanguage: {
            name: 'Accept-Language',
            in: 'header' as const,
            required: false,
            schema: { type: 'string' as const, enum: ['es', 'en'], default: 'es' },
            description: 'Response language. Defaults to Spanish (es).',
          },
        },
      },
    },
  });

  await server.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });

  // Inject Accept-Language header into OpenAPI spec (documentation only, no validation)
  server.addHook('onRoute', (routeOptions) => {
    if (!routeOptions.url.startsWith('/api/')) return;

    const schema = routeOptions.schema ?? {};
    const existingHeaders =
      schema.headers && typeof schema.headers === 'object' && 'properties' in schema.headers
        ? (schema.headers as Record<string, unknown>).properties as Record<string, unknown>
        : {};

    routeOptions.schema = {
      ...schema,
      headers: {
        type: 'object' as const,
        properties: {
          ...existingHeaders,
          'Accept-Language': {
            type: 'string',
            default: 'es',
            description: 'Response language: es (Spanish, default) or en (English)',
          },
        },
      },
    };
  });
});
