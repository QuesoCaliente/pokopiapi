import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { readJson, ROOT, VALIDATION_REPORT_PATH, type ValidationReport } from './lib.js';

const bucket = process.argv[2];
const requestedSlugs = new Set(process.argv.slice(3));
if (!bucket) throw new Error('Usage: npm run assets:upload -- <bucket-name>');
if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
  throw new Error('CLOUDFLARE_ACCOUNT_ID is required when Wrangler can access multiple accounts.');
}

function runWrangler(args: string[]): Promise<void> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(
      process.execPath,
      [resolve(ROOT, 'node_modules/wrangler/bin/wrangler.js'), ...args],
      {
        stdio: 'inherit',
      },
    );
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolveRun() : reject(new Error(`Wrangler exited with code ${code}`)),
    );
  });
}

const report = await readJson<ValidationReport>(VALIDATION_REPORT_PATH);
const assets = requestedSlugs.size
  ? report.valid.filter((asset) => requestedSlugs.has(asset.slug))
  : report.valid;
if (requestedSlugs.size && assets.length !== requestedSlugs.size) {
  const found = new Set(assets.map((asset) => asset.slug));
  throw new Error(
    `Requested assets were not validated: ${[...requestedSlugs].filter((slug) => !found.has(slug)).join(', ')}`,
  );
}
for (const asset of assets) {
  await runWrangler([
    'r2',
    'object',
    'put',
    `${bucket}/${asset.expectedCdnKey}`,
    '--file',
    asset.path,
    '--content-type',
    asset.mime,
    '--cache-control',
    'public, max-age=31536000, immutable',
    '--remote',
  ]);
}
console.log(`Uploaded ${assets.length} validated assets to ${bucket}.`);
