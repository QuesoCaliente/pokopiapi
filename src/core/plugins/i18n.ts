import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Translations {
  pokemon: {
    classifications: Record<string, string>;
    climates: Record<string, string>;
    habitats: Record<string, string>;
    idealEnvironments: Record<string, string>;
    produces: Record<string, string>;
    spawnZones: Record<string, string>;
    specialties: Record<string, string>;
    time: Record<string, string>;
    types: Record<string, string>;
  };
  items: {
    categories: Record<string, string>;
    craftingMaterials: Record<string, string>;
    descriptions: Record<string, string>;
    locations: Record<string, string[]>;
    names: Record<string, string>;
    tags: Record<string, string>;
  };
}

const translationsDir = resolve(import.meta.dirname!, '../../data/translations');
const es: Translations = JSON.parse(readFileSync(resolve(translationsDir, 'es.json'), 'utf-8'));
const en: Translations = JSON.parse(readFileSync(resolve(translationsDir, 'en.json'), 'utf-8'));

type Locale = 'es' | 'en';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildReverseMap(source: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(source)) {
    map.set(value, key);
  }
  return map;
}

// Pokemon data is stored in ES, so we need reverse maps from ES value → slug
const esTypeReverse = buildReverseMap(es.pokemon.types);
const esSpecialtyReverse = buildReverseMap(es.pokemon.specialties);
const esClimateReverse = buildReverseMap(es.pokemon.climates);
const esTimeReverse = buildReverseMap(es.pokemon.time);
const esHabitatReverse = buildReverseMap(es.pokemon.habitats);
const esProducesReverse = buildReverseMap(es.pokemon.produces);
const esClassificationReverse = buildReverseMap(es.pokemon.classifications);
const esSpawnZoneReverse = buildReverseMap(es.pokemon.spawnZones);
const esIdealEnvReverse = buildReverseMap(es.pokemon.idealEnvironments);

function translatePokemonValue(
  esValue: string,
  reverseMap: Map<string, string>,
  targetDict: Record<string, string>,
): string {
  const slug = reverseMap.get(esValue);
  if (slug && targetDict[slug]) return targetDict[slug];
  return esValue;
}

function translatePokemon(pokemon: Record<string, unknown>, t: Translations): Record<string, unknown> {
  const p = { ...pokemon };

  // types
  if (Array.isArray(p.types)) {
    p.types = (p.types as Array<{ name: string; iconUrl: string }>).map((item) => ({
      ...item,
      name: translatePokemonValue(item.name, esTypeReverse, t.pokemon.types),
    }));
  }

  // specialties
  if (Array.isArray(p.specialties)) {
    p.specialties = (p.specialties as Array<{ name: string; iconUrl: string }>).map((item) => ({
      ...item,
      name: translatePokemonValue(item.name, esSpecialtyReverse, t.pokemon.specialties),
    }));
  }

  // classification
  if (typeof p.classification === 'string') {
    p.classification = translatePokemonValue(p.classification, esClassificationReverse, t.pokemon.classifications);
  }

  // climates
  if (Array.isArray(p.climates)) {
    p.climates = (p.climates as Array<{ name: string; iconUrl: string }>).map((item) => ({
      ...item,
      name: translatePokemonValue(item.name, esClimateReverse, t.pokemon.climates),
    }));
  }

  // timeAvailability
  if (Array.isArray(p.timeAvailability)) {
    p.timeAvailability = (p.timeAvailability as Array<{ name: string; iconUrl: string }>).map((item) => ({
      ...item,
      name: translatePokemonValue(item.name, esTimeReverse, t.pokemon.time),
    }));
  }

  // habitats
  if (Array.isArray(p.habitats)) {
    p.habitats = (p.habitats as Array<{ name: string; rarity: number; iconUrl: string }>).map((item) => ({
      ...item,
      name: translatePokemonValue(item.name, esHabitatReverse, t.pokemon.habitats),
    }));
  }

  // spawnZones
  if (Array.isArray(p.spawnZones)) {
    p.spawnZones = (p.spawnZones as string[]).map(
      (zone) => translatePokemonValue(zone, esSpawnZoneReverse, t.pokemon.spawnZones),
    );
  }

  // idealEnvironment
  if (typeof p.idealEnvironment === 'string') {
    p.idealEnvironment = translatePokemonValue(p.idealEnvironment, esIdealEnvReverse, t.pokemon.idealEnvironments);
  }

  // produces
  if (p.produces && typeof p.produces === 'object') {
    const prod = p.produces as { name: string; iconUrl: string };
    p.produces = {
      ...prod,
      name: translatePokemonValue(prod.name, esProducesReverse, t.pokemon.produces),
    };
  }

  return p;
}

function translateItem(item: Record<string, unknown>, t: Translations): Record<string, unknown> {
  const i = { ...item };
  const slug = i.slug as string;

  // name
  if (t.items.names[slug]) {
    i.name = t.items.names[slug];
  }

  // description
  if (t.items.descriptions[slug]) {
    i.description = t.items.descriptions[slug];
  }

  // category
  if (typeof i.category === 'string' && t.items.categories[i.category]) {
    i.category = t.items.categories[i.category];
  }

  // tag
  if (typeof i.tag === 'string') {
    const tagSlug = slugify(i.tag);
    if (t.items.tags[tagSlug]) {
      i.tag = t.items.tags[tagSlug];
    }
  }

  // locations
  if (t.items.locations[slug]) {
    i.locations = t.items.locations[slug];
  }

  // craftingRecipe
  if (Array.isArray(i.craftingRecipe)) {
    i.craftingRecipe = (i.craftingRecipe as Array<{ name: string; slug: string; quantity: number; iconUrl: string | null }>).map((mat) => ({
      ...mat,
      name: t.items.craftingMaterials[mat.slug] ?? mat.name,
    }));
  }

  return i;
}

function translateFilters(filters: Record<string, unknown>, route: 'pokemon' | 'items', t: Translations): Record<string, unknown> {
  if (route === 'pokemon') {
    const f = { ...filters };
    if (Array.isArray(f.types)) {
      f.types = (f.types as Array<{ name: string; iconUrl: string }>).map((item) => ({
        ...item,
        name: translatePokemonValue(item.name, esTypeReverse, t.pokemon.types),
      }));
    }
    if (Array.isArray(f.specialties)) {
      f.specialties = (f.specialties as Array<{ name: string; iconUrl: string }>).map((item) => ({
        ...item,
        name: translatePokemonValue(item.name, esSpecialtyReverse, t.pokemon.specialties),
      }));
    }
    if (Array.isArray(f.climates)) {
      f.climates = (f.climates as Array<{ name: string; iconUrl: string }>).map((item) => ({
        ...item,
        name: translatePokemonValue(item.name, esClimateReverse, t.pokemon.climates),
      }));
    }
    if (Array.isArray(f.zones)) {
      f.zones = (f.zones as string[]).map(
        (zone) => translatePokemonValue(zone, esSpawnZoneReverse, t.pokemon.spawnZones),
      );
    }
    if (Array.isArray(f.habitats)) {
      f.habitats = (f.habitats as Array<{ name: string; iconUrl: string }>).map((item) => ({
        ...item,
        name: translatePokemonValue(item.name, esHabitatReverse, t.pokemon.habitats),
      }));
    }
    if (Array.isArray(f.classifications)) {
      f.classifications = (f.classifications as string[]).map(
        (c) => translatePokemonValue(c, esClassificationReverse, t.pokemon.classifications),
      );
    }
    if (Array.isArray(f.materials)) {
      f.materials = (f.materials as Array<{ name: string; iconUrl: string }>).map((item) => ({
        ...item,
        name: translatePokemonValue(item.name, esProducesReverse, t.pokemon.produces),
      }));
    }
    return f;
  }

  if (route === 'items') {
    const f = { ...filters };
    if (Array.isArray(f.categories)) {
      f.categories = (f.categories as string[]).map((c) => t.items.categories[c] ?? c);
    }
    if (Array.isArray(f.tags)) {
      f.tags = (f.tags as string[]).map((tag) => {
        const tagSlug = slugify(tag);
        return t.items.tags[tagSlug] ?? tag;
      });
    }
    return f;
  }

  return filters;
}

function translateStats(stats: Record<string, unknown>, route: 'pokemon' | 'items', t: Translations): Record<string, unknown> {
  if (route === 'pokemon') {
    const s = { ...stats };
    if (s.byClassification && typeof s.byClassification === 'object') {
      const bc = s.byClassification as Record<string, number>;
      const translated: Record<string, number> = {};
      for (const [key, count] of Object.entries(bc)) {
        const slug = esClassificationReverse.get(key) ?? key;
        const translatedKey = t.pokemon.classifications[slug] ?? key;
        translated[translatedKey] = count;
      }
      s.byClassification = translated;
    }
    if (Array.isArray(s.byType)) {
      s.byType = (s.byType as Array<{ name: string; iconUrl: string; count: number }>).map((item) => ({
        ...item,
        name: translatePokemonValue(item.name, esTypeReverse, t.pokemon.types),
      }));
    }
    if (Array.isArray(s.bySpecialty)) {
      s.bySpecialty = (s.bySpecialty as Array<{ name: string; iconUrl: string; count: number }>).map((item) => ({
        ...item,
        name: translatePokemonValue(item.name, esSpecialtyReverse, t.pokemon.specialties),
      }));
    }
    return s;
  }

  if (route === 'items') {
    const s = { ...stats };
    if (Array.isArray(s.byCategory)) {
      s.byCategory = (s.byCategory as Array<{ category: string; count: number }>).map((item) => ({
        ...item,
        category: t.items.categories[item.category] ?? item.category,
      }));
    }
    return s;
  }

  return stats;
}

function parseLocale(header: string | undefined): Locale {
  if (!header) return 'es';
  const primary = header.split(',')[0].trim().toLowerCase();
  if (primary.startsWith('en')) return 'en';
  return 'es';
}

function detectRoute(url: string): { resource: 'pokemon' | 'items' | null; endpoint: 'list' | 'filters' | 'stats' | 'detail' | null } {
  const path = url.split('?')[0];

  if (path.match(/\/api\/v1\/pokemon\/filters\/?$/)) return { resource: 'pokemon', endpoint: 'filters' };
  if (path.match(/\/api\/v1\/pokemon\/stats\/?$/)) return { resource: 'pokemon', endpoint: 'stats' };
  if (path.match(/\/api\/v1\/pokemon\/[^/]+\/?$/)) return { resource: 'pokemon', endpoint: 'detail' };
  if (path.match(/\/api\/v1\/pokemon\/?$/)) return { resource: 'pokemon', endpoint: 'list' };

  if (path.match(/\/api\/v1\/items\/filters\/?$/)) return { resource: 'items', endpoint: 'filters' };
  if (path.match(/\/api\/v1\/items\/stats\/?$/)) return { resource: 'items', endpoint: 'stats' };
  if (path.match(/\/api\/v1\/items\/[^/]+\/?$/)) return { resource: 'items', endpoint: 'detail' };
  if (path.match(/\/api\/v1\/items\/?$/)) return { resource: 'items', endpoint: 'list' };

  return { resource: null, endpoint: null };
}

export default fp(async (server: FastifyInstance) => {
  server.addHook('preSerialization', async (request, _reply, payload) => {
    if (request.method !== 'GET') return payload;

    const { resource, endpoint } = detectRoute(request.url);
    if (!resource || !endpoint) return payload;

    const locale = parseLocale(request.headers['accept-language']);
    const t = locale === 'en' ? en : es;

    // If pokemon data is already in ES and locale is ES, skip translation
    // If items data is already in EN and locale is EN, skip translation
    const skipPokemon = locale === 'es';
    const skipItems = locale === 'en';

    if (resource === 'pokemon' && skipPokemon) return payload;
    if (resource === 'items' && skipItems) return payload;

    const body = payload as Record<string, unknown>;

    if (endpoint === 'filters') {
      return translateFilters(body, resource, t);
    }

    if (endpoint === 'stats') {
      return translateStats(body, resource, t);
    }

    if (endpoint === 'detail') {
      if (resource === 'pokemon') {
        return translatePokemon(body, t);
      }
      if (resource === 'items') {
        const data = body.data as Record<string, unknown>;
        return { ...body, data: translateItem(data, t) };
      }
    }

    if (endpoint === 'list') {
      if (Array.isArray(body.data)) {
        const translator = resource === 'pokemon' ? translatePokemon : translateItem;
        return {
          ...body,
          data: (body.data as Record<string, unknown>[]).map((item) => translator(item, t)),
        };
      }
    }

    return payload;
  });
});
