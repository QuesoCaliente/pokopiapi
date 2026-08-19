import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  assertCompleteVerification,
  validatePng,
  type AssetManifest,
  type ValidatedAsset,
  type VerificationReport,
} from '../scripts/assets/lib.js';
import { ITEM_SOURCE_ALIASES, POKEMON_FORM_ASSETS } from '../scripts/assets/reviewed-mappings.js';
import { applyVerifiedAssets, type DataRecord } from '../scripts/assets/update-records.js';

function pngHeader(width: number, height: number, size = 256): Uint8Array {
  const data = new Uint8Array(size);
  data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(data.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return data;
}

describe('validatePng', () => {
  it('accepts a non-placeholder PNG with the expected MIME type', () => {
    const result = validatePng(pngHeader(64, 64), 'image/png');
    expect(result).toMatchObject({ mime: 'image/png', bytes: 256, width: 64, height: 64 });
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects mismatched MIME types', () => {
    expect(() => validatePng(pngHeader(64, 64), 'text/html')).toThrow('Expected image/png');
  });

  it('rejects invalid signatures and placeholder-sized images', () => {
    expect(() => validatePng(new Uint8Array(256), 'image/png')).toThrow('valid PNG signature');
    expect(() => validatePng(pngHeader(1, 1), 'image/png')).toThrow('placeholder-sized');
  });
});

const expectedAliases = {
  'Running Shoes': 'Running shoes',
  'Stately wall (upper/lower)': 'Stately wall (upper lower)',
  'Sea grape stalk': 'Seagrape stalk',
  '♪ The Sea': 'The Sea',
  '♪ Violet City': 'Violet City',
  '♪ Dive': 'Dive',
  '♪ Canalave City (Night)': 'Canalave City (Night)',
  '♪ Undella Town (Summer)': 'Undella Town (Summer)',
  '♪ Lumiose City': 'Lumiose City',
  '♪ Po Town': 'Po Town',
  '♪ Stow-on-Side': 'Stow-on-Side',
  '♪ Cascarrafa': 'Cascarrafa',
  '♪ Hotel Z': 'Hotel Z',
  'Farm soil': 'Farm soil (Wastelands)',
};

describe('reviewed expansion mappings', () => {
  it('contains only the 14 audited item aliases', () => {
    expect(ITEM_SOURCE_ALIASES).toEqual(expectedAliases);
  });

  it('defines the four audited Frillish and Jellicent form assets', () => {
    expect(
      POKEMON_FORM_ASSETS.map(({ recordSlug, formSlug, sourceName }) => ({
        recordSlug,
        formSlug,
        sourceName,
      })),
    ).toEqual([
      { recordSlug: 'frillish', formSlug: 'male', sourceName: 'Frillish Male Form' },
      { recordSlug: 'frillish', formSlug: 'female', sourceName: 'Frillish Female Form' },
      { recordSlug: 'jellicent', formSlug: 'male', sourceName: 'Jellicent Male Form' },
      { recordSlug: 'jellicent', formSlug: 'female', sourceName: 'Jellicent Female Form' },
    ]);
  });
});

function verifiedAsset(
  overrides: Partial<ValidatedAsset> = {},
): ValidatedAsset & { publicUrl: string } {
  return {
    kind: 'pokemon',
    slug: 'frillish-male',
    expectedCdnKey: 'images/pokemon/frillish-male.png',
    path: 'staging/frillish-male.png',
    sourceUrl: 'https://source.example/frillish-male.png',
    mime: 'image/png',
    bytes: 256,
    width: 64,
    height: 64,
    sha256: 'a'.repeat(64),
    publicUrl: 'https://cdn.example/images/pokemon/frillish-male.png',
    ...overrides,
  };
}

describe('verified data updates', () => {
  it('writes form URLs while preserving the parent null and unrelated forms', () => {
    const records: DataRecord[] = [
      {
        slug: 'frillish',
        imageUrl: null,
        forms: [
          { slug: 'male', imageUrl: null },
          { slug: 'female', imageUrl: null },
        ],
      },
    ];
    const changed = applyVerifiedAssets('pokemon', records, [
      verifiedAsset({ recordSlug: 'frillish', formSlug: 'male' }),
    ]);
    expect(changed).toBe(1);
    expect(records[0]?.imageUrl).toBeNull();
    expect(records[0]?.forms).toEqual([
      { slug: 'male', imageUrl: 'https://cdn.example/images/pokemon/frillish-male.png' },
      { slug: 'female', imageUrl: null },
    ]);
  });

  it('rejects incomplete verification before any URL can be written', () => {
    const asset = verifiedAsset();
    const manifest: AssetManifest = {
      version: 1,
      sources: [],
      assets: [
        {
          kind: 'pokemon',
          name: 'Frillish (Male)',
          slug: asset.slug,
          sourcePage: 'https://source.example',
          provenancePage: 'https://provenance.example',
          sourceUrl: asset.sourceUrl,
          attribution: 'test',
          licenseNotes: 'test',
          expectedCdnKey: asset.expectedCdnKey,
          status: 'available',
          missingReason: null,
        },
      ],
    };
    const report: VerificationReport = { verified: [], failed: [] };
    expect(() => assertCompleteVerification(manifest, report)).toThrow('incomplete verification');
  });
});

describe('generated expansion manifest', () => {
  it('covers all base identities and four forms without assigning parent gender images', async () => {
    const manifest = JSON.parse(
      await readFile(new URL('../scripts/assets/manifest.json', import.meta.url), 'utf8'),
    ) as AssetManifest;
    const pokemon = JSON.parse(
      await readFile(new URL('../src/data/pokemon.json', import.meta.url), 'utf8'),
    ) as DataRecord[];
    const baseAssets = manifest.assets.filter((asset) => !asset.formSlug);
    const formAssets = manifest.assets.filter((asset) => asset.formSlug);
    expect(baseAssets.filter((asset) => asset.kind === 'pokemon')).toHaveLength(50);
    expect(baseAssets.filter((asset) => asset.kind === 'items')).toHaveLength(219);
    expect(formAssets).toHaveLength(4);
    expect(formAssets.every((asset) => asset.status === 'available' && asset.recordSlug)).toBe(
      true,
    );
    expect(
      baseAssets.filter((asset) => asset.status === 'missing').map((asset) => asset.slug),
    ).toEqual(['frillish', 'jellicent']);
    for (const slug of ['frillish', 'jellicent']) {
      const record = pokemon.find((entry) => entry.slug === slug);
      expect(record?.imageUrl).toBeNull();
      expect(record?.forms).toEqual([
        {
          name: 'Male',
          slug: 'male',
          imageUrl: `https://cdn.pokopiapi.com/images/pokemon/${slug}-male.png`,
        },
        {
          name: 'Female',
          slug: 'female',
          imageUrl: `https://cdn.pokopiapi.com/images/pokemon/${slug}-female.png`,
        },
      ]);
    }
  });
});
