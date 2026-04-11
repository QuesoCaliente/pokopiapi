import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Pokemon, PokemonQuery, IconItem } from '../schemas/pokemon.js';

const dataPath = resolve(import.meta.dirname!, 'pokemon.json');
const allPokemon: Pokemon[] = JSON.parse(readFileSync(dataPath, 'utf-8'));

const bySlug = new Map<string, Pokemon>();
const byNationalNumber = new Map<number, Pokemon>();

for (const p of allPokemon) {
  bySlug.set(p.slug, p);
  byNationalNumber.set(p.nationalNumber, p);
}

// Extract unique IconItems (deduplicated by name)
function uniqueIconItems(items: IconItem[]): IconItem[] {
  const map = new Map<string, IconItem>();
  for (const item of items) {
    if (!map.has(item.name)) map.set(item.name, item);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const allTypes = uniqueIconItems(allPokemon.flatMap((p) => p.types));
const allSpecialties = uniqueIconItems(allPokemon.flatMap((p) => p.specialties));
const allClimates = uniqueIconItems(allPokemon.flatMap((p) => p.climates));
const allZones = [...new Set(allPokemon.flatMap((p) => p.spawnZones))].sort();
const allHabitats = uniqueIconItems(
  allPokemon.flatMap((p) => p.habitats.map((h) => ({ name: h.name, iconUrl: h.iconUrl }))),
);
const allClassifications = [...new Set(allPokemon.map((p) => p.classification))].sort();
const allMaterials = uniqueIconItems(
  allPokemon.map((p) => p.produces).filter((p): p is NonNullable<typeof p> => p !== null),
);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function findAll(query: PokemonQuery) {
  let filtered = allPokemon;

  if (query.type) {
    const t = normalize(query.type);
    filtered = filtered.filter((p) => p.types.some((type) => normalize(type.name) === t));
  }

  if (query.specialty) {
    const s = normalize(query.specialty);
    filtered = filtered.filter((p) => p.specialties.some((sp) => normalize(sp.name) === s));
  }

  if (query.classification) {
    const c = normalize(query.classification);
    filtered = filtered.filter((p) => normalize(p.classification) === c);
  }

  if (query.climate) {
    const cl = normalize(query.climate);
    filtered = filtered.filter((p) => p.climates.some((c) => normalize(c.name) === cl));
  }

  if (query.zone) {
    const z = normalize(query.zone);
    filtered = filtered.filter((p) => p.spawnZones.some((sz) => normalize(sz) === z));
  }

  if (query.produces) {
    const pr = normalize(query.produces);
    filtered = filtered.filter((p) => p.produces && normalize(p.produces.name).includes(pr));
  }

  if (query.habitat) {
    const h = normalize(query.habitat);
    filtered = filtered.filter((p) => p.habitats.some((hab) => normalize(hab.name).includes(h)));
  }

  if (query.search) {
    const s = normalize(query.search);
    filtered = filtered.filter(
      (p) =>
        normalize(p.name).includes(s) ||
        normalize(p.slug).includes(s) ||
        p.localNumber.includes(s) ||
        String(p.nationalNumber).includes(s),
    );
  }

  const total = filtered.length;
  const start = (query.page - 1) * query.limit;
  const data = filtered.slice(start, start + query.limit);

  return {
    data,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export function findBySlug(slug: string): Pokemon | undefined {
  return bySlug.get(slug);
}

export function findByNationalNumber(num: number): Pokemon | undefined {
  return byNationalNumber.get(num);
}

export function getFilters() {
  return {
    types: allTypes,
    specialties: allSpecialties,
    climates: allClimates,
    zones: allZones,
    materials: allMaterials,
    habitats: allHabitats,
    classifications: allClassifications,
  };
}

export function getStats() {
  return {
    total: allPokemon.length,
    byClassification: {
      comun: allPokemon.filter((p) => p.classification === 'comun').length,
      evento: allPokemon.filter((p) => p.classification === 'evento').length,
    },
    byType: allTypes.map((type) => ({
      ...type,
      count: allPokemon.filter((p) => p.types.some((t) => t.name === type.name)).length,
    })),
    bySpecialty: allSpecialties.map((sp) => ({
      ...sp,
      count: allPokemon.filter((p) => p.specialties.some((s) => s.name === sp.name)).length,
    })),
  };
}
