import { z } from 'zod';

export const contentSourceSchema = z.enum(['base', 'free-update', 'event', 'expansion-pass']);

export const releaseSchema = z.object({
  patch: z.string().nullable(),
  date: z.string().date().nullable(),
});

export const availabilitySchema = z.object({
  kind: z.enum(['permanent', 'annual-event', 'limited', 'unknown']),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  timeZone: z.string().nullable(),
  requiresInternet: z.boolean().nullable(),
});

export const eventAssociationSchema = z.object({
  slug: z.string(),
  name: z.string(),
});

export const provenanceSchema = z.object({
  source: z.enum(['official', 'community', 'repository']),
  name: z.string(),
  url: z.string().url().nullable(),
  verifiedAt: z.string().date(),
  notes: z.string().optional(),
});

export const dataStatusSchema = z.enum(['verified', 'partial', 'unverified']);

export type ContentSource = z.infer<typeof contentSourceSchema>;
export type Release = z.infer<typeof releaseSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
export type EventAssociation = z.infer<typeof eventAssociationSchema>;
export type Provenance = z.infer<typeof provenanceSchema>;
export type DataStatus = z.infer<typeof dataStatusSchema>;
