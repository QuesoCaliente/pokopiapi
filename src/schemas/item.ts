import { z } from 'zod';

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
});

export type Item = z.infer<typeof itemSchema>;
export type CraftingMaterial = z.infer<typeof craftingMaterialSchema>;

export const itemQuerySchema = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  hasImage: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ItemQuery = z.infer<typeof itemQuerySchema>;
