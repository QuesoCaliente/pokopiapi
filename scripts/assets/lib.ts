import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '../..');
export const STAGING_DIR = resolve(import.meta.dirname, '.staging');
export const MANIFEST_PATH = resolve(import.meta.dirname, 'manifest.json');
export const VALIDATION_REPORT_PATH = resolve(STAGING_DIR, 'validation-report.json');
export const VERIFICATION_REPORT_PATH = resolve(STAGING_DIR, 'verification-report.json');
export const USER_AGENT =
  'pokopiapi-asset-pipeline/1.0 (+https://github.com/QuesoCaliente/pokopiapi; asset provenance research)';

export type AssetKind = 'pokemon' | 'items';
export type AssetStatus = 'available' | 'missing';

export interface AssetManifestEntry {
  kind: AssetKind;
  name: string;
  slug: string;
  sourcePage: string;
  provenancePage: string;
  sourceUrl: string | null;
  attribution: string;
  licenseNotes: string;
  expectedCdnKey: string;
  status: AssetStatus;
  missingReason: string | null;
  recordSlug?: string;
  formSlug?: string;
}

export interface AssetManifest {
  version: 1;
  sources: Array<{
    name: string;
    page: string;
    robots: string;
    notes: string;
  }>;
  assets: AssetManifestEntry[];
}

export interface ValidatedAsset {
  kind: AssetKind;
  slug: string;
  expectedCdnKey: string;
  path: string;
  sourceUrl: string;
  mime: 'image/png';
  bytes: number;
  width: number;
  height: number;
  sha256: string;
  recordSlug?: string;
  formSlug?: string;
}

export interface ValidationReport {
  valid: ValidatedAsset[];
  invalid: Array<{ kind: AssetKind; slug: string; reason: string }>;
  unavailable: Array<{ kind: AssetKind; slug: string; reason: string }>;
}

export interface VerificationReport {
  verified: Array<ValidatedAsset & { publicUrl: string }>;
  failed: Array<{ kind: AssetKind; slug: string; reason: string }>;
}

export function assertCompleteVerification(
  manifest: AssetManifest,
  report: VerificationReport,
): void {
  if (report.failed.length) {
    throw new Error('Refusing to update data while public verification has failures.');
  }
  const expected = new Set(
    manifest.assets
      .filter((asset) => asset.status === 'available')
      .map((asset) => asset.expectedCdnKey),
  );
  const verified = new Set(report.verified.map((asset) => asset.expectedCdnKey));
  const missing = [...expected].filter((key) => !verified.has(key));
  const unexpected = [...verified].filter((key) => !expected.has(key));
  const manifestByKey = new Map(manifest.assets.map((asset) => [asset.expectedCdnKey, asset]));
  const mismatched = report.verified.filter((asset) => {
    const entry = manifestByKey.get(asset.expectedCdnKey);
    return (
      !entry ||
      asset.kind !== entry.kind ||
      asset.slug !== entry.slug ||
      asset.sourceUrl !== entry.sourceUrl ||
      asset.recordSlug !== entry.recordSlug ||
      asset.formSlug !== entry.formSlug
    );
  });
  if (
    verified.size !== report.verified.length ||
    missing.length ||
    unexpected.length ||
    mismatched.length
  ) {
    throw new Error(
      `Refusing incomplete verification (missing: ${missing.join(', ') || 'none'}; unexpected: ${unexpected.join(', ') || 'none'}; mismatched: ${mismatched.map((asset) => asset.expectedCdnKey).join(', ') || 'none'}).`,
    );
  }
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

export function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

export function validatePng(
  data: Uint8Array,
  contentType: string | null,
): Omit<ValidatedAsset, 'kind' | 'slug' | 'expectedCdnKey' | 'path' | 'sourceUrl'> {
  if (contentType?.split(';', 1)[0].trim().toLowerCase() !== 'image/png') {
    throw new Error(`Expected image/png, received ${contentType ?? 'no Content-Type'}`);
  }
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (data.length < 33 || !signature.every((byte, index) => data[index] === byte)) {
    throw new Error('File does not have a valid PNG signature and IHDR chunk');
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width < 16 || height < 16 || data.length < 200) {
    throw new Error(`Rejected placeholder-sized PNG (${width}x${height}, ${data.length} bytes)`);
  }
  return { mime: 'image/png', bytes: data.length, width, height, sha256: sha256(data) };
}

export async function fetchWithIdentity(url: string): Promise<Response> {
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,image/png;q=0.9,*/*;q=0.1' },
    redirect: 'follow',
  });
}
