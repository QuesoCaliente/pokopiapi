import { z } from 'zod';
import {
  availabilitySchema,
  contentSourceSchema,
  dataStatusSchema,
  eventAssociationSchema,
  provenanceSchema,
  releaseSchema,
} from './content.js';

export const iconItemSchema = z.object({
  name: z.string(),
  iconUrl: z.string().nullable(),
});

export const pokemonHabitatSchema = z.object({
  name: z.string(),
  rarity: z.number().int().min(1).max(3).nullable(),
  iconUrl: z.string().nullable(),
});

export const pokemonDexSchema = z.object({
  kind: z.enum(['regular', 'event', 'basin']),
  number: z.string(),
});

export const pokemonFormSchema = z.object({
  name: z.string(),
  slug: z.string(),
  imageUrl: z.string().nullable(),
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
  height: z.number().nullable(),
  weight: z.number().nullable(),
  idealEnvironment: z.string().nullable(),
  classification: z.string(),
  habitats: z.array(pokemonHabitatSchema),
  climates: z.array(iconItemSchema),
  timeAvailability: z.array(iconItemSchema),
  spawnZones: z.array(z.string()),
  previousEvolution: pokemonEvolutionSchema.nullable(),
  nextEvolution: pokemonEvolutionSchema.nullable(),
  imageUrl: z.string().nullable(),
  produces: iconItemSchema.nullable(),
  dex: pokemonDexSchema.optional(),
  contentSource: contentSourceSchema.optional(),
  release: releaseSchema.nullable().optional(),
  availability: availabilitySchema.optional(),
  event: eventAssociationSchema.nullable().optional(),
  provenance: z.array(provenanceSchema).optional(),
  forms: z.array(pokemonFormSchema).optional(),
  dataStatus: dataStatusSchema.optional(),
  unknownFields: z.array(z.string()).optional(),
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
  dex: z.enum(['regular', 'event', 'basin']).optional(),
  contentSource: contentSourceSchema.optional(),
  event: z.string().optional(),
  form: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PokemonQuery = z.infer<typeof pokemonQuerySchema>;
