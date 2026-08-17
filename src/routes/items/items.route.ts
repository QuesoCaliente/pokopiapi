import type { FastifyInstance } from 'fastify';
import { itemQuerySchema } from '../../schemas/item.js';
import { findAll, findBySlug, getFilters, getStats } from '../../data/item-store.js';
import { trackEvent } from '../../core/posthog.js';

export default async function itemRoutes(server: FastifyInstance) {
  // GET /items - List with filters and pagination
  server.get('/items', {
    schema: {
      tags: ['Items (Experimental)'],
      description:
        'List items with optional filters and pagination. This endpoint is experimental.',
      querystring: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter by category (e.g., furniture, materials)',
          },
          tag: { type: 'string', description: 'Filter by tag (e.g., Decoration, Relaxation)' },
          search: { type: 'string', description: 'Search by name' },
          hasImage: {
            type: 'string',
            enum: ['true', 'false'],
            description: 'Filter by image availability',
          },
          contentSource: {
            type: 'string',
            enum: ['base', 'free-update', 'event', 'expansion-pass'],
            description: 'Filter by the content that introduced the item',
          },
          event: { type: 'string', description: 'Filter by event name or slug' },
          recipeStatus: {
            type: 'string',
            enum: ['none', 'verified', 'incomplete'],
            description: 'Filter by recipe verification status',
          },
          page: { type: 'integer', default: 1, minimum: 1 },
          limit: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
        },
      },
    },
    handler: async (request) => {
      const query = itemQuerySchema.parse(request.query);
      const result = findAll(query);
      trackEvent(request, 'item_searched', {
        category: query.category ?? null,
        tag: query.tag ?? null,
        search: query.search ?? null,
        hasImage: query.hasImage ?? null,
        content_source: query.contentSource ?? null,
        event: query.event ?? null,
        recipe_status: query.recipeStatus ?? null,
        page: query.page,
        limit: query.limit,
        result_count: result.pagination.total,
      });
      return result;
    },
  });

  // GET /items/filters - Available filter values
  server.get('/items/filters', {
    schema: {
      tags: ['Items (Experimental)'],
      description: 'Get all available filter values for items',
    },
    handler: async (request) => {
      trackEvent(request, 'item_filters_fetched');
      return getFilters();
    },
  });

  // GET /items/stats - Item statistics
  server.get('/items/stats', {
    schema: {
      tags: ['Items (Experimental)'],
      description: 'Get item statistics by category',
    },
    handler: async (request) => {
      trackEvent(request, 'item_stats_fetched');
      return getStats();
    },
  });

  // GET /items/:slug - Get item by slug
  server.get<{ Params: { slug: string } }>('/items/:slug', {
    schema: {
      tags: ['Items (Experimental)'],
      description: 'Get an item by its slug',
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Item slug' },
        },
        required: ['slug'],
      },
      response: {
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { slug } = request.params;

      const item = findBySlug(slug);
      if (item) {
        trackEvent(request, 'item_detail_viewed', {
          slug: item.slug,
          name: item.name,
          category: item.category,
        });
        return { experimental: true, data: item };
      }

      trackEvent(request, 'item_not_found', { query: slug });
      return reply.status(404).send({ error: `Item "${slug}" not found` });
    },
  });
}
