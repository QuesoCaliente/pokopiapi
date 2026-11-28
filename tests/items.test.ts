import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { itemSchema, type Item } from '../src/schemas/item.js';

describe('Items API', () => {
  async function getServer() {
    return buildApp();
  }

  it('should return all cataloged Basin item names', async () => {
    const server = await getServer();
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/items?contentSource=expansion-pass&limit=100',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().pagination).toMatchObject({ total: 219, totalPages: 3 });

    await server.close();
  });

  it('should return all 68 event items without duplicating legacy records', async () => {
    const server = await getServer();
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/items?contentSource=event&limit=100',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().pagination.total).toBe(68);

    await server.close();
  });

  it('should list Halloween and Apples to Applin event items', async () => {
    const server = await buildApp();
    const halloween = await server.inject({
      method: 'GET',
      url: '/api/v1/items?event=pumpkaboo-s-sweet-surprises&limit=100',
    });
    const applin = await server.inject({
      method: 'GET',
      url: '/api/v1/items?event=apples-to-applin&limit=100&lang=en',
    });

    expect(halloween.json().pagination.total).toBe(10);
    expect(applin.json().pagination.total).toBe(12);
    expect(applin.json().data.map((item: Item) => item.name)).toContain('Syrupy Apple');

    await server.close();
  });

  it('should expose the verified Wish note recipe', async () => {
    const server = await getServer();
    const res = await server.inject({ method: 'GET', url: '/api/v1/items/wish-note?lang=en' });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({
      recipeStatus: 'verified',
      craftingRecipe: [{ name: 'Vine rope', slug: 'vine-rope', quantity: 2, iconUrl: null }],
    });

    await server.close();
  });

  it('should distinguish incomplete Basin recipes', async () => {
    const server = await getServer();
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/items?contentSource=expansion-pass&recipeStatus=incomplete&limit=100',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().pagination.total).toBe(15);
    expect(res.json().data.every((item: Item) => item.recipeStatus === 'incomplete')).toBe(true);

    await server.close();
  });

  it('should expose source, event and recipe filters', async () => {
    const server = await getServer();
    const res = await server.inject({ method: 'GET', url: '/api/v1/items/filters' });

    expect(res.statusCode).toBe(200);
    expect(res.json().contentSources).toEqual(['base', 'event', 'expansion-pass']);
    expect(res.json().recipeStatuses).toEqual(['incomplete', 'none', 'verified']);
    expect(res.json().events).toHaveLength(9);

    await server.close();
  });

  it('should report all Event items in statistics', async () => {
    const server = await getServer();
    const res = await server.inject({ method: 'GET', url: '/api/v1/items/stats' });

    expect(res.statusCode).toBe(200);
    expect(res.json().byContentSource.event).toBe(68);

    await server.close();
  });

  it('should validate every item data record with Zod', () => {
    const data = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../src/data/items.json'), 'utf8'),
    ) as unknown[];

    expect(data).toHaveLength(1789);
    expect(new Set(data.map((item) => (item as Item).slug)).size).toBe(data.length);
    for (const item of data) expect(itemSchema.safeParse(item).success).toBe(true);
  });

  it('should keep every crafting material reference resolvable', () => {
    const data = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../src/data/items.json'), 'utf8'),
    ) as Item[];
    const slugs = new Set(data.map((item) => item.slug));

    for (const item of data) {
      for (const material of item.craftingRecipe ?? []) {
        expect(slugs.has(material.slug), `${item.slug} references ${material.slug}`).toBe(true);
      }
    }
  });

  it('should keep populated values out of unknownFields', () => {
    const data = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../src/data/items.json'), 'utf8'),
    ) as Item[];

    for (const item of data) {
      const unknown = new Set(item.unknownFields ?? []);
      if (item.tag !== null) expect(unknown.has('tag'), item.slug).toBe(false);
      if (item.imageUrl !== null) expect(unknown.has('imageUrl'), item.slug).toBe(false);
      if (item.locations.length > 0) expect(unknown.has('locations'), item.slug).toBe(false);
      if (item.release !== null && item.release !== undefined) {
        expect(unknown.has('release'), item.slug).toBe(false);
      }
      if (item.recipeLocation !== null && item.recipeLocation !== undefined) {
        expect(unknown.has('recipeLocation'), item.slug).toBe(false);
      }
      if (item.availability?.requiresInternet !== null) {
        expect(unknown.has('availability.requiresInternet'), item.slug).toBe(false);
      }
    }
  });

  it('should separate multiple recipe locations', () => {
    const data = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../src/data/items.json'), 'utf8'),
    ) as Item[];

    expect(data.filter((item) => item.recipeLocation?.includes('whirlpoolShop'))).toEqual([]);
    expect(data.filter((item) => item.recipeLocation?.includes('whirlpool; Shop')).length).toBe(22);
  });
});
