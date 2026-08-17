import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildApp } from '../src/app.js';
import { pokemonSchema, type Pokemon, type IconItem } from '../src/schemas/pokemon.js';

describe('Pokemon API', () => {
  async function getServer() {
    return buildApp();
  }

  describe('GET /pokemon', () => {
    it('should return paginated pokemon list', async () => {
      const server = await getServer();
      const res = await server.inject({ method: 'GET', url: '/api/v1/pokemon' });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toBeDefined();
      expect(body.pagination).toBeDefined();
      expect(body.pagination.total).toBeGreaterThan(0);
      expect(body.data.length).toBeLessThanOrEqual(20);

      await server.close();
    });

    it('should filter by type', async () => {
      const server = await getServer();
      const res = await server.inject({ method: 'GET', url: '/api/v1/pokemon?type=Fuego' });

      const body = res.json();
      expect(body.data.length).toBeGreaterThan(0);
      body.data.forEach((p: Pokemon) => {
        expect(p.types.some((t: IconItem) => t.name === 'Fuego')).toBe(true);
      });

      await server.close();
    });

    it('should filter by specialty', async () => {
      const server = await getServer();
      const res = await server.inject({ method: 'GET', url: '/api/v1/pokemon?specialty=Volar' });

      const body = res.json();
      expect(body.data.length).toBeGreaterThan(0);
      body.data.forEach((p: Pokemon) => {
        expect(p.specialties.some((s: IconItem) => s.name === 'Volar')).toBe(true);
      });

      await server.close();
    });

    it('should search by name', async () => {
      const server = await getServer();
      const res = await server.inject({ method: 'GET', url: '/api/v1/pokemon?search=pikachu' });

      const body = res.json();
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].name.toLowerCase()).toContain('pikachu');

      await server.close();
    });

    it('should paginate correctly', async () => {
      const server = await getServer();
      const res = await server.inject({ method: 'GET', url: '/api/v1/pokemon?page=2&limit=5' });

      const body = res.json();
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(5);
      expect(body.data.length).toBeLessThanOrEqual(5);

      await server.close();
    });

    it('should filter the Basin Pokedex', async () => {
      const server = await getServer();
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/pokemon?dex=basin&limit=100',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.pagination.total).toBe(50);
      expect(body.data.every((p: Pokemon) => p.dex?.kind === 'basin')).toBe(true);

      await server.close();
    });

    it('should expose verified Pokemon forms', async () => {
      const server = await getServer();
      const res = await server.inject({ method: 'GET', url: '/api/v1/pokemon/frillish' });

      expect(res.statusCode).toBe(200);
      expect(res.json().forms.map((form: { name: string }) => form.name)).toEqual([
        'Male',
        'Female',
      ]);

      await server.close();
    });

    it('should filter Pokemon by content source and event', async () => {
      const server = await getServer();
      const sourceRes = await server.inject({
        method: 'GET',
        url: '/api/v1/pokemon?contentSource=expansion-pass&limit=100',
      });
      const eventRes = await server.inject({
        method: 'GET',
        url: '/api/v1/pokemon?event=fetching-scales-for-feebas',
      });

      expect(sourceRes.json().pagination.total).toBe(50);
      expect(eventRes.json().data.map((p: Pokemon) => p.slug)).toEqual(['feebas', 'milotic']);

      await server.close();
    });
  });

  describe('GET /pokemon/:slugOrNumber', () => {
    it('should find by slug', async () => {
      const server = await getServer();
      const res = await server.inject({ method: 'GET', url: '/api/v1/pokemon/charizard' });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.slug).toBe('charizard');
      expect(body.types.some((t: IconItem) => t.name === 'Fuego')).toBe(true);

      await server.close();
    });

    it('should find by national number', async () => {
      const server = await getServer();
      const res = await server.inject({ method: 'GET', url: '/api/v1/pokemon/25' });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.name).toBe('Pikachu');

      await server.close();
    });

    it('should find the latest Event Pokedex entry', async () => {
      const server = await getServer();
      const res = await server.inject({ method: 'GET', url: '/api/v1/pokemon/milotic' });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        localNumber: 'E007',
        dex: { kind: 'event', number: '007' },
        dataStatus: 'partial',
      });

      await server.close();
    });

    it('should return 404 for unknown pokemon', async () => {
      const server = await getServer();
      const res = await server.inject({ method: 'GET', url: '/api/v1/pokemon/fakemon' });

      expect(res.statusCode).toBe(404);

      await server.close();
    });
  });

  describe('GET /pokemon/filters', () => {
    it('should return all available filters', async () => {
      const server = await getServer();
      const res = await server.inject({ method: 'GET', url: '/api/v1/pokemon/filters' });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.types).toBeInstanceOf(Array);
      expect(body.specialties).toBeInstanceOf(Array);
      expect(body.climates).toBeInstanceOf(Array);
      expect(body.zones).toBeInstanceOf(Array);
      expect(body.types.length).toBeGreaterThan(0);
      expect(body.dexes).toEqual(['basin', 'event', 'regular']);
      expect(body.contentSources).toContain('expansion-pass');
      expect(body.events).toHaveLength(4);
      expect(body.forms).toEqual(['Female', 'Male']);

      await server.close();
    });
  });

  describe('GET /pokemon/stats', () => {
    it('should return pokedex statistics', async () => {
      const server = await getServer();
      const res = await server.inject({ method: 'GET', url: '/api/v1/pokemon/stats' });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBeGreaterThan(300);
      expect(body.byType).toBeInstanceOf(Array);
      expect(body.bySpecialty).toBeInstanceOf(Array);
      expect(body.total).toBe(365);
      expect(body.byDex).toEqual({ regular: 308, event: 7, basin: 50 });

      await server.close();
    });
  });

  it('should validate every Pokemon data record with Zod', () => {
    const data = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../src/data/pokemon.json'), 'utf8'),
    ) as unknown[];

    expect(data).toHaveLength(365);
    for (const pokemon of data) expect(pokemonSchema.safeParse(pokemon).success).toBe(true);
  });

  it('should keep Event and Basin Pokedex numbers contiguous', () => {
    const data = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../src/data/pokemon.json'), 'utf8'),
    ) as Pokemon[];

    expect(
      data.filter((pokemon) => pokemon.dex?.kind === 'event').map((p) => p.localNumber),
    ).toEqual(Array.from({ length: 7 }, (_, index) => `E${String(index + 1).padStart(3, '0')}`));
    expect(
      data.filter((pokemon) => pokemon.dex?.kind === 'basin').map((p) => p.localNumber),
    ).toEqual(Array.from({ length: 50 }, (_, index) => `B${String(index + 1).padStart(3, '0')}`));
  });

  it('should model all seven Event Pokemon through four real events', () => {
    const data = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../src/data/pokemon.json'), 'utf8'),
    ) as Pokemon[];
    const eventPokemon = data.filter((pokemon) => pokemon.dex?.kind === 'event');

    expect(eventPokemon).toHaveLength(7);
    expect(new Set(eventPokemon.map((pokemon) => pokemon.event?.slug)).size).toBe(4);
    expect(eventPokemon.every((pokemon) => pokemon.contentSource === 'event')).toBe(true);
    expect(eventPokemon.every((pokemon) => pokemon.provenance?.length)).toBe(true);
  });

  it('should keep populated Pokemon values out of unknownFields', () => {
    const data = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../src/data/pokemon.json'), 'utf8'),
    ) as Pokemon[];

    for (const pokemon of data) {
      const unknown = new Set(pokemon.unknownFields ?? []);
      if (pokemon.height !== null) expect(unknown.has('height'), pokemon.slug).toBe(false);
      if (pokemon.weight !== null) expect(unknown.has('weight'), pokemon.slug).toBe(false);
      if (pokemon.idealEnvironment !== null) {
        expect(unknown.has('idealEnvironment'), pokemon.slug).toBe(false);
      }
      if (pokemon.climates.length > 0) expect(unknown.has('climates'), pokemon.slug).toBe(false);
      if (pokemon.timeAvailability.length > 0) {
        expect(unknown.has('timeAvailability'), pokemon.slug).toBe(false);
      }
      if (pokemon.imageUrl !== null) expect(unknown.has('imageUrl'), pokemon.slug).toBe(false);
      if (pokemon.produces !== null) expect(unknown.has('produces'), pokemon.slug).toBe(false);
      if (pokemon.release !== null && pokemon.release !== undefined) {
        expect(unknown.has('release'), pokemon.slug).toBe(false);
      }
      if (pokemon.availability?.requiresInternet !== null) {
        expect(unknown.has('availability.requiresInternet'), pokemon.slug).toBe(false);
      }
    }
  });
});
