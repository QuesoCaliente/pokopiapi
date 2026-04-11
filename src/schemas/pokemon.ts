import { z } from 'zod';

export const iconItemSchema = z.object({
  name: z.string(),
  iconUrl: z.string(),
});

export const pokemonHabitatSchema = z.object({
  name: z.string(),
  rarity: z.number().int().min(1).max(3),
  iconUrl: z.string(),
});

export const pokemonEvolutionSchema = z.object({
  number: z.string(),
  name: z.string(),
});

export const pokemonSchema = z.object({
  localNumber: z.string(),
  nationalNumber: z.number().int(),
  name: z.string(),
  slug: z.string(),
  types: z.array(iconItemSchema),
  specialties: z.array(iconItemSchema),
  height: z.number(),
  weight: z.number(),
  idealEnvironment: z.string(),
  classification: z.string(),
  habitats: z.array(pokemonHabitatSchema),
  climates: z.array(iconItemSchema),
  timeAvailability: z.array(iconItemSchema),
  spawnZones: z.array(z.string()),
  previousEvolution: pokemonEvolutionSchema.nullable(),
  nextEvolution: pokemonEvolutionSchema.nullable(),
  imageUrl: z.string(),
  produces: iconItemSchema.nullable(),
});

export type Pokemon = z.infer<typeof pokemonSchema>;
export type PokemonHabitat = z.infer<typeof pokemonHabitatSchema>;
export type IconItem = z.infer<typeof iconItemSchema>;

export const pokemonQuerySchema = z.object({
  type: z.string().optional(),
  specialty: z.string().optional(),
  classification: z.string().optional(),
  climate: z.string().optional(),
  zone: z.string().optional(),
  habitat: z.string().optional(),
  produces: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PokemonQuery = z.infer<typeof pokemonQuerySchema>;
