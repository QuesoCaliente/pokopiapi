import { load } from 'cheerio';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  MANIFEST_PATH,
  ROOT,
  USER_AGENT,
  type AssetManifest,
  type AssetManifestEntry,
} from './lib.js';
import { ITEM_SOURCE_ALIASES, POKEMON_FORM_ASSETS } from './reviewed-mappings.js';

const SEREBII_ROBOTS = 'https://www.serebii.net/robots.txt';
const POKEMON_PAGE = 'https://www.serebii.net/pokemonpokopia/basinpokedex.shtml';
const ITEMS_PAGE = 'https://www.serebii.net/pokemonpokopia/items.shtml';
const POKEMON_PROVENANCE =
  'https://bulbapedia.bulbagarden.net/w/index.php?title=List_of_Pok%C3%A9mon_by_Pok%C3%A9dex_(Basin)_number_in_Pok%C3%A9mon_Pokopia&oldid=4609372';
const ITEMS_PROVENANCE =
  'https://bulbapedia.bulbagarden.net/w/index.php?title=List_of_Basin_items_in_Pok%C3%A9mon_Pokopia&oldid=4613812';
const ATTRIBUTION =
  'Sprite published by Serebii.net; Pokémon and related assets belong to their respective rights holders.';
const LICENSE_NOTES =
  'Serebii states that its site content is copyrighted and does not state a redistribution license. Pokémon names and assets are trademarks/copyright of Nintendo and related rights holders.';

interface PokemonRecord {
  name: string;
  slug: string;
  contentSource?: string;
  imageUrl: string | null;
  forms?: Array<{ name: string; slug: string; imageUrl: string | null }>;
}

interface ItemRecord extends PokemonRecord {}

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

async function fetchAllowedPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

function indexExactRows(html: string, page: string, imagePath: RegExp): Map<string, string> {
  const $ = load(html);
  const matches = new Map<string, string>();
  $('tr').each((_, row) => {
    const image = $(row)
      .find('img')
      .filter((__, element) => imagePath.test($(element).attr('src') ?? ''))
      .first();
    if (!image.length) return;
    const cells = $(row)
      .find('td')
      .map((__, cell) => compactText($(cell).text()))
      .get();
    const imageAlt = compactText(image.attr('alt') ?? '').replace(/ Image$/, '');
    const name = cells.find((cell) => cell === imageAlt) ?? imageAlt;
    const src = image.attr('src');
    if (name && src && !matches.has(name)) matches.set(name, new URL(src, page).href);
  });
  return matches;
}

function makeEntry(
  kind: 'pokemon' | 'items',
  record: PokemonRecord,
  sourcePage: string,
  provenancePage: string,
  sourceUrl: string | undefined,
): AssetManifestEntry {
  return {
    kind,
    name: record.name,
    slug: record.slug,
    sourcePage,
    provenancePage,
    sourceUrl: sourceUrl ?? null,
    attribution: ATTRIBUTION,
    licenseNotes: LICENSE_NOTES,
    expectedCdnKey: `images/${kind}/${record.slug}.png`,
    status: sourceUrl ? 'available' : 'missing',
    missingReason: sourceUrl ? null : 'No exact-name PNG match was found on the source page.',
  };
}

function makeFormEntry(
  form: (typeof POKEMON_FORM_ASSETS)[number],
  sourceUrl: string | undefined,
): AssetManifestEntry {
  const slug = `${form.recordSlug}-${form.formSlug}`;
  return {
    ...makeEntry(
      'pokemon',
      { name: `${form.recordName} (${form.formName})`, slug, imageUrl: null },
      POKEMON_PAGE,
      POKEMON_PROVENANCE,
      sourceUrl,
    ),
    recordSlug: form.recordSlug,
    formSlug: form.formSlug,
  };
}

async function main(): Promise<void> {
  const robots = await fetchAllowedPage(SEREBII_ROBOTS);
  if (/Disallow:\s*\/pokemonpokopia\//i.test(robots)) {
    throw new Error('Serebii robots.txt disallows /pokemonpokopia/');
  }

  const pokemonHtml = await fetchAllowedPage(POKEMON_PAGE);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
  const itemsHtml = await fetchAllowedPage(ITEMS_PAGE);
  const pokemonSources = indexExactRows(
    pokemonHtml,
    POKEMON_PAGE,
    /^\/pokemonpokopia\/pokemon\/small\/[^/]+\.png$/,
  );
  const itemSources = indexExactRows(itemsHtml, ITEMS_PAGE, /^items\/[^/]+\.png$/);

  const pokemon = JSON.parse(
    await readFile(resolve(ROOT, 'src/data/pokemon.json'), 'utf8'),
  ) as PokemonRecord[];
  const items = JSON.parse(
    await readFile(resolve(ROOT, 'src/data/items.json'), 'utf8'),
  ) as ItemRecord[];
  const expansionPokemon = pokemon.filter((entry) => entry.contentSource === 'expansion-pass');
  const expansionItems = items.filter((entry) => entry.contentSource === 'expansion-pass');
  if (expansionPokemon.length !== 50 || expansionItems.length !== 219) {
    throw new Error(
      `Expected 50 Pokémon and 219 items, found ${expansionPokemon.length} and ${expansionItems.length}`,
    );
  }
  for (const formAsset of POKEMON_FORM_ASSETS) {
    const record = pokemon.find((entry) => entry.slug === formAsset.recordSlug);
    const form = record?.forms?.find((entry) => entry.slug === formAsset.formSlug);
    if (!record || !form || record.imageUrl !== null) {
      throw new Error(
        `Expected a null parent image URL and form target for ${formAsset.recordSlug}/${formAsset.formSlug}`,
      );
    }
  }

  const manifest: AssetManifest = {
    version: 1,
    sources: [
      {
        name: 'Serebii Pokémon Pokopia Basin Pokédex',
        page: POKEMON_PAGE,
        robots: SEREBII_ROBOTS,
        notes:
          'Preferred over generic Pokémon HOME menu art because these images are published in Serebii’s Pokopia-specific sprite directory.',
      },
      {
        name: 'Serebii Pokémon Pokopia item listing',
        page: ITEMS_PAGE,
        robots: SEREBII_ROBOTS,
        notes: 'Entries are matched by exact displayed name only; no fuzzy matching is used.',
      },
    ],
    assets: [
      ...expansionPokemon.map((entry) =>
        makeEntry(
          'pokemon',
          entry,
          POKEMON_PAGE,
          POKEMON_PROVENANCE,
          pokemonSources.get(entry.name),
        ),
      ),
      ...POKEMON_FORM_ASSETS.map((form) =>
        makeFormEntry(form, pokemonSources.get(form.sourceName)),
      ),
      ...expansionItems.map((entry) =>
        makeEntry(
          'items',
          entry,
          ITEMS_PAGE,
          ITEMS_PROVENANCE,
          itemSources.get(
            ITEM_SOURCE_ALIASES[entry.name as keyof typeof ITEM_SOURCE_ALIASES] ?? entry.name,
          ),
        ),
      ),
    ],
  };
  await mkdir(resolve(import.meta.dirname), { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  const available = manifest.assets.filter((entry) => entry.status === 'available');
  console.log(
    `Manifest: ${available.filter((entry) => entry.kind === 'pokemon' && !entry.formSlug).length}/50 base Pokémon, ${available.filter((entry) => entry.formSlug).length}/4 Pokémon forms, ${available.filter((entry) => entry.kind === 'items').length}/219 items available.`,
  );
}

await main();
