import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Item, ItemQuery } from '../schemas/item.js';

const dataPath = resolve(import.meta.dirname!, 'items.json');
const allItems: Item[] = JSON.parse(readFileSync(dataPath, 'utf-8'));

const bySlug = new Map<string, Item>();
for (const item of allItems) {
  bySlug.set(item.slug, item);
}

const allCategories = [...new Set(allItems.map((i) => i.category))].sort();
const allTags = [...new Set(allItems.map((i) => i.tag).filter((t): t is string => t !== null))].sort();

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function findAll(query: ItemQuery) {
  let filtered = allItems;

  if (query.category) {
    const c = normalize(query.category);
    filtered = filtered.filter((i) => normalize(i.category) === c);
  }

  if (query.tag) {
    const t = normalize(query.tag);
    filtered = filtered.filter((i) => i.tag && normalize(i.tag) === t);
  }

  if (query.hasImage !== undefined) {
    filtered = filtered.filter((i) => (query.hasImage ? i.imageUrl !== null : i.imageUrl === null));
  }

  if (query.search) {
    const s = normalize(query.search);
    filtered = filtered.filter(
      (i) => normalize(i.name).includes(s) || normalize(i.slug).includes(s),
    );
  }

  const total = filtered.length;
  const start = (query.page - 1) * query.limit;
  const data = filtered.slice(start, start + query.limit);

  return {
    experimental: true,
    data,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export function findBySlug(slug: string): Item | undefined {
  return bySlug.get(slug);
}

export function getFilters() {
  return {
    categories: allCategories,
    tags: allTags,
  };
}

export function getStats() {
  return {
    total: allItems.length,
    withImage: allItems.filter((i) => i.imageUrl !== null).length,
    withCraftingRecipe: allItems.filter((i) => i.craftingRecipe !== null).length,
    byCategory: allCategories.map((cat) => ({
      category: cat,
      count: allItems.filter((i) => i.category === cat).length,
    })),
  };
}
