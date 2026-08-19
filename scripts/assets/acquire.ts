import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  MANIFEST_PATH,
  STAGING_DIR,
  VALIDATION_REPORT_PATH,
  fetchWithIdentity,
  readJson,
  validatePng,
  type AssetManifest,
  type ValidationReport,
} from './lib.js';

async function main(): Promise<void> {
  const manifest = await readJson<AssetManifest>(MANIFEST_PATH);
  const report: ValidationReport = { valid: [], invalid: [], unavailable: [] };
  for (const entry of manifest.assets) {
    if (!entry.sourceUrl) {
      report.unavailable.push({
        kind: entry.kind,
        slug: entry.slug,
        reason: entry.missingReason ?? 'No source URL',
      });
      continue;
    }
    try {
      const response = await fetchWithIdentity(entry.sourceUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = new Uint8Array(await response.arrayBuffer());
      const validation = validatePng(data, response.headers.get('content-type'));
      const outputPath = resolve(STAGING_DIR, entry.kind, `${entry.slug}.png`);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, data);
      report.valid.push({
        kind: entry.kind,
        slug: entry.slug,
        expectedCdnKey: entry.expectedCdnKey,
        path: outputPath,
        sourceUrl: entry.sourceUrl,
        ...(entry.recordSlug ? { recordSlug: entry.recordSlug } : {}),
        ...(entry.formSlug ? { formSlug: entry.formSlug } : {}),
        ...validation,
      });
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    } catch (error) {
      report.invalid.push({
        kind: entry.kind,
        slug: entry.slug,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  await mkdir(STAGING_DIR, { recursive: true });
  await writeFile(VALIDATION_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Validated ${report.valid.length}; invalid ${report.invalid.length}; unavailable ${report.unavailable.length}.`,
  );
  if (report.invalid.length) process.exitCode = 1;
}

await main();
