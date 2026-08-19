# Expansion asset pipeline

This pipeline maps the 50 expansion Pokémon, four reviewed gender-form assets, and 219 expansion items to exact or explicitly reviewed image sources, downloads and validates PNG files in a gitignored staging directory, uploads validated files to R2, verifies the public CDN response and checksum, and only then updates API data.

## Provenance and rights

- Pokémon images come from Serebii's Pokémon Pokopia Basin Pokédex and use its Pokopia-specific sprite directory rather than generic Pokémon HOME menu art.
- Item images come from Serebii's Pokémon Pokopia item listing.
- The pinned Bulbapedia pages in each manifest entry remain the expansion roster provenance references. Bulbapedia's `robots.txt` disallows automated requests containing `oldid`, so the pipeline does not crawl those pinned URLs.
- Serebii states that its site content is copyrighted and does not publish a redistribution license. Pokémon names and assets remain the property of their respective rights holders. The manifest records this limitation; it does not claim permission or a license.
- Matching is exact after HTML entity decoding and whitespace compaction, except for the explicit reviewed aliases in `reviewed-mappings.ts`. The tooling never uses fuzzy name matching.

## Commands

```sh
npm run assets:manifest
npm run assets:acquire
npm run test:assets
```

Before upload, prove the account and bucket identity independently:

```sh
npx wrangler whoami
npx wrangler r2 bucket list
npx wrangler r2 bucket domain list <bucket-name>
```

When Wrangler has access to multiple accounts, set `CLOUDFLARE_ACCOUNT_ID` for the intended account without committing it. Then publish in this strict order:

```sh
npm run assets:upload -- <verified-bucket-name>
npm run assets:verify -- https://cdn.example.com
npm run assets:update-data
```

To upload only selected newly validated assets, append their manifest slugs after the bucket name.

`assets:update-data` refuses to run if any uploaded object failed public HTTP, MIME, PNG signature, dimensions, or SHA-256 verification. Staged binaries and reports live under `scripts/assets/.staging/` and are gitignored.
