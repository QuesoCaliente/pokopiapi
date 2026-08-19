import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  MANIFEST_PATH,
  ROOT,
  VERIFICATION_REPORT_PATH,
  assertCompleteVerification,
  readJson,
  type AssetManifest,
  type VerificationReport,
} from './lib.js';
import { applyVerifiedAssets, type DataRecord } from './update-records.js';

const report = await readJson<VerificationReport>(VERIFICATION_REPORT_PATH);
const manifest = await readJson<AssetManifest>(MANIFEST_PATH);
assertCompleteVerification(manifest, report);

for (const [kind, file] of [
  ['pokemon', 'pokemon.json'],
  ['items', 'items.json'],
] as const) {
  const path = resolve(ROOT, 'src/data', file);
  const records = JSON.parse(await readFile(path, 'utf8')) as DataRecord[];
  const changed = applyVerifiedAssets(kind, records, report.verified);
  await writeFile(path, `${JSON.stringify(records, null, 2)}\n`);
  console.log(`Updated ${changed} ${kind} records.`);
}
