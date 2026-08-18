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

function dexKind(pokemon: Pokemon): 'regular' | 'event' | 'basin' {
  if (pokemon.dex) return pokemon.dex.kind;
  return pokemon.classification === 'evento' ? 'event' : 'regular';
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

  if (query.dex) {
    filtered = filtered.filter((p) => dexKind(p) === query.dex);
  }

  if (query.contentSource) {
    filtered = filtered.filter((p) => {
      const source = p.contentSource ?? (p.classification === 'evento' ? 'event' : 'base');
      return source === query.contentSource;
    });
  }

  if (query.event) {
    const event = normalize(query.event);
    filtered = filtered.filter(
      (p) =>
        p.event &&
        (normalize(p.event.slug).includes(event) || normalize(p.event.name).includes(event)),
    );
  }

  if (query.form) {
    const form = normalize(query.form);
    filtered = filtered.filter((p) => p.forms?.some((value) => normalize(value.name) === form));
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
    dexes: [...new Set(allPokemon.map(dexKind))].sort(),
    contentSources: [
      ...new Set(
        allPokemon.map(
          (p) => p.contentSource ?? (p.classification === 'evento' ? 'event' : 'base'),
        ),
      ),
    ].sort(),
    events: [
      ...new Map(allPokemon.filter((p) => p.event).map((p) => [p.event!.slug, p.event!])).values(),
    ].sort((a, b) => a.name.localeCompare(b.name)),
    forms: [...new Set(allPokemon.flatMap((p) => p.forms?.map((form) => form.name) ?? []))].sort(),
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
    byDex: Object.fromEntries(
      ['regular', 'event', 'basin'].map((dex) => [
        dex,
        allPokemon.filter((p) => dexKind(p) === dex).length,
      ]),
    ),
    byContentSource: Object.fromEntries(
      ['base', 'free-update', 'event', 'expansion-pass'].map((source) => [
        source,
        allPokemon.filter(
          (p) => (p.contentSource ?? (p.classification === 'evento' ? 'event' : 'base')) === source,
        ).length,
      ]),
    ),
    partial: allPokemon.filter((p) => p.dataStatus === 'partial').length,
  };
}
