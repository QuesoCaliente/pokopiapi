import type { FastifyInstance } from 'fastify';
import { pokemonQuerySchema } from '../../schemas/pokemon.js';
import {
  findAll,
  findBySlug,
  findByNationalNumber,
  getFilters,
  getStats,
} from '../../data/pokemon-store.js';
import { posthog } from '../../core/posthog.js';

export default async function pokemonRoutes(server: FastifyInstance) {
  // GET /pokemon - List with filters and pagination
  server.get('/pokemon', {
    schema: {
      tags: ['Pokemon'],
      description: 'List Pokemon with optional filters and pagination',
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Filter by type (e.g., Fuego, Planta)' },
          specialty: { type: 'string', description: 'Filter by specialty (e.g., Quemar, Volar)' },
          classification: {
            type: 'string',
            description: 'Filter by classification (comun, evento)',
          },
          climate: {
            type: 'string',
            description: 'Filter by climate (Soleado, Nublado, Lluvioso)',
          },
          zone: { type: 'string', description: 'Filter by spawn zone' },
          habitat: { type: 'string', description: 'Filter by habitat name' },
          produces: {
            type: 'string',
            description: 'Filter by material produced (e.g., Hoja, Piedra, Hilo)',
          },
          search: { type: 'string', description: 'Search by name or number' },
          page: { type: 'integer', default: 1, minimum: 1 },
          limit: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
        },
      },
    },
    handler: async (request) => {
      const query = pokemonQuerySchema.parse(request.query);
      const result = findAll(query);
      const distinctId =
        (request.headers['x-posthog-distinct-id'] as string | undefined) ?? 'anonymous';
      posthog.capture({
        distinctId,
        event: 'pokemon_searched',
        properties: {
          type: query.type ?? null,
          specialty: query.specialty ?? null,
          classification: query.classification ?? null,
          climate: query.climate ?? null,
          zone: query.zone ?? null,
          habitat: query.habitat ?? null,
          produces: query.produces ?? null,
          search: query.search ?? null,
          page: query.page,
          limit: query.limit,
          result_count: result.pagination.total,
        },
      });
      return result;
    },
  });

  // GET /pokemon/filters - Available filter values
  server.get('/pokemon/filters', {
    schema: {
      tags: ['Pokemon'],
      description: 'Get all available filter values',
    },
    handler: async (request) => {
      const distinctId =
        (request.headers['x-posthog-distinct-id'] as string | undefined) ?? 'anonymous';
      posthog.capture({ distinctId, event: 'pokemon_filters_fetched' });
      return getFilters();
    },
  });

  // GET /pokemon/stats - Pokedex statistics
  server.get('/pokemon/stats', {
    schema: {
      tags: ['Pokemon'],
      description: 'Get Pokedex statistics',
    },
    handler: async (request) => {
      const distinctId =
        (request.headers['x-posthog-distinct-id'] as string | undefined) ?? 'anonymous';
      posthog.capture({ distinctId, event: 'pokemon_stats_fetched' });
      return getStats();
    },
  });

  // GET /pokemon/:slugOrNumber - Get by slug or national number
  server.get<{ Params: { slugOrNumber: string } }>('/pokemon/:slugOrNumber', {
    schema: {
      tags: ['Pokemon'],
      description: 'Get a Pokemon by slug or national Pokedex number',
      params: {
        type: 'object',
        properties: {
          slugOrNumber: { type: 'string', description: 'Pokemon slug or national number' },
        },
        required: ['slugOrNumber'],
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
      const { slugOrNumber } = request.params;
      const distinctId =
        (request.headers['x-posthog-distinct-id'] as string | undefined) ?? 'anonymous';

      // Try as number first
      const asNumber = parseInt(slugOrNumber);
      if (!isNaN(asNumber)) {
        const pokemon = findByNationalNumber(asNumber);
        if (pokemon) {
          posthog.capture({
            distinctId,
            event: 'pokemon_detail_viewed',
            properties: {
              lookup: 'national_number',
              value: asNumber,
              slug: pokemon.slug,
              name: pokemon.name,
            },
          });
          return pokemon;
        }
      }

      // Try as slug
      const pokemon = findBySlug(slugOrNumber);
      if (pokemon) {
        posthog.capture({
          distinctId,
          event: 'pokemon_detail_viewed',
          properties: {
            lookup: 'slug',
            value: slugOrNumber,
            slug: pokemon.slug,
            name: pokemon.name,
          },
        });
        return pokemon;
      }

      posthog.capture({
        distinctId,
        event: 'pokemon_not_found',
        properties: { query: slugOrNumber },
      });
      return reply.status(404).send({ error: `Pokemon "${slugOrNumber}" not found` });
    },
  });
}
