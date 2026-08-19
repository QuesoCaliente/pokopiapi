import { mkdir, writeFile } from 'node:fs/promises';
import {
  STAGING_DIR,
  VALIDATION_REPORT_PATH,
  VERIFICATION_REPORT_PATH,
  fetchWithIdentity,
  readJson,
  validatePng,
  type ValidationReport,
  type VerificationReport,
} from './lib.js';

const baseUrl = (process.argv[2] ?? '').replace(/\/$/, '');
if (!/^https:\/\//.test(baseUrl)) {
  throw new Error('Usage: npm run assets:verify -- https://cdn.example.com');
}

const validation = await readJson<ValidationReport>(VALIDATION_REPORT_PATH);
const report: VerificationReport = { verified: [], failed: [] };
for (const asset of validation.valid) {
  const publicUrl = `${baseUrl}/${asset.expectedCdnKey}`;
  try {
    const response = await fetchWithIdentity(publicUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const remote = validatePng(
      new Uint8Array(await response.arrayBuffer()),
      response.headers.get('content-type'),
    );
    if (remote.sha256 !== asset.sha256) throw new Error('SHA-256 checksum differs from staging');
    report.verified.push({ ...asset, publicUrl });
  } catch (error) {
    report.failed.push({
      kind: asset.kind,
      slug: asset.slug,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
await mkdir(STAGING_DIR, { recursive: true });
await writeFile(VERIFICATION_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Verified ${report.verified.length}; failed ${report.failed.length}.`);
if (report.failed.length) process.exitCode = 1;
