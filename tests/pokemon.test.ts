import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';
import type { Pokemon, IconItem } from '../src/schemas/pokemon.js';

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

      await server.close();
    });
  });
});
