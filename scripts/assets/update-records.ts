import type { ValidatedAsset } from './lib.js';

interface FormRecord {
  slug: string;
  imageUrl: string | null;
}

export interface DataRecord {
  slug: string;
  imageUrl: string | null;
  forms?: FormRecord[];
  unknownFields?: string[];
}

type VerifiedAsset = ValidatedAsset & { publicUrl: string };

export function applyVerifiedAssets(
  kind: 'pokemon' | 'items',
  records: DataRecord[],
  assets: VerifiedAsset[],
): number {
  let changed = 0;
  for (const asset of assets.filter((entry) => entry.kind === kind)) {
    if (asset.formSlug) {
      const record = records.find((entry) => entry.slug === asset.recordSlug);
      const form = record?.forms?.find((entry) => entry.slug === asset.formSlug);
      if (!record || !form || record.imageUrl !== null) {
        throw new Error(`Invalid form target ${asset.recordSlug ?? 'unknown'}/${asset.formSlug}`);
      }
      form.imageUrl = asset.publicUrl;
      changed += 1;
      continue;
    }
    const record = records.find((entry) => entry.slug === asset.slug);
    if (!record) throw new Error(`Missing ${kind} data target for ${asset.slug}`);
    record.imageUrl = asset.publicUrl;
    if (record.unknownFields) {
      record.unknownFields = record.unknownFields.filter((field) => field !== 'imageUrl');
    }
    changed += 1;
  }
  return changed;
}
