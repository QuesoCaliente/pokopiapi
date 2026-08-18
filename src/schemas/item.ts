import { z } from 'zod';
import {
  availabilitySchema,
  contentSourceSchema,
  dataStatusSchema,
  eventAssociationSchema,
  provenanceSchema,
  releaseSchema,
} from './content.js';

export const craftingMaterialSchema = z.object({
  name: z.string(),
  slug: z.string(),
  quantity: z.number().int(),
  iconUrl: z.string().nullable(),
});

export const itemSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  tag: z.string().nullable(),
  imageUrl: z.string().nullable(),
  locations: z.array(z.string()),
  craftingRecipe: z.array(craftingMaterialSchema).nullable(),
  recipeStatus: z.enum(['none', 'verified', 'incomplete']).optional(),
  recipeLocation: z.string().nullable().optional(),
  contentSource: contentSourceSchema.optional(),
  release: releaseSchema.nullable().optional(),
  availability: availabilitySchema.optional(),
  event: eventAssociationSchema.nullable().optional(),
  provenance: z.array(provenanceSchema).optional(),
  dataStatus: dataStatusSchema.optional(),
  unknownFields: z.array(z.string()).optional(),
});

export type Item = z.infer<typeof itemSchema>;
export type CraftingMaterial = z.infer<typeof craftingMaterialSchema>;

export const itemQuerySchema = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  contentSource: contentSourceSchema.optional(),
  event: z.string().optional(),
  recipeStatus: z.enum(['none', 'verified', 'incomplete']).optional(),
  hasImage: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ItemQuery = z.infer<typeof itemQuerySchema>;
