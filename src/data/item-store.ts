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
const allTags = [
  ...new Set(allItems.map((i) => i.tag).filter((t): t is string => t !== null)),
].sort();

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

  if (query.contentSource) {
    filtered = filtered.filter((i) => (i.contentSource ?? 'base') === query.contentSource);
  }

  if (query.event) {
    const event = normalize(query.event);
    filtered = filtered.filter(
      (i) =>
        i.event &&
        (normalize(i.event.slug).includes(event) || normalize(i.event.name).includes(event)),
    );
  }

  if (query.recipeStatus) {
    filtered = filtered.filter(
      (i) => (i.recipeStatus ?? (i.craftingRecipe ? 'verified' : 'none')) === query.recipeStatus,
    );
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
    contentSources: [...new Set(allItems.map((i) => i.contentSource ?? 'base'))].sort(),
    recipeStatuses: [
      ...new Set(allItems.map((i) => i.recipeStatus ?? (i.craftingRecipe ? 'verified' : 'none'))),
    ].sort(),
    events: [
      ...new Map(allItems.filter((i) => i.event).map((i) => [i.event!.slug, i.event!])).values(),
    ].sort((a, b) => a.name.localeCompare(b.name)),
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
    byContentSource: Object.fromEntries(
      ['base', 'free-update', 'event', 'expansion-pass'].map((source) => [
        source,
        allItems.filter((i) => (i.contentSource ?? 'base') === source).length,
      ]),
    ),
    byRecipeStatus: Object.fromEntries(
      ['none', 'verified', 'incomplete'].map((status) => [
        status,
        allItems.filter(
          (i) => (i.recipeStatus ?? (i.craftingRecipe ? 'verified' : 'none')) === status,
        ).length,
      ]),
    ),
    partial: allItems.filter((i) => i.dataStatus === 'partial').length,
  };
}
