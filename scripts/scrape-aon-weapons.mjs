import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Builds src/data/weapons.generated.json from Archives of Nethys (aonprd.com)'s
// Weapons page. Unlike the magic-item pages, EquipmentWeapons.aspx renders no
// rows until a `Proficiency` filter is supplied (the base tabs are Simple,
// Martial, Exotic, Ammo, Firearm, Mod, Siege, Special) so we crawl each tab's
// list separately, then follow every EquipmentWeaponsDisplay.aspx?ItemName=
// link for the full stat block. Detail pages are cached to disk
// (.tmp/aon-weapons-pages) so re-runs after a crash or script tweak don't
// re-fetch pages we already have.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '.tmp/aon-weapons-pages');
const OUT_FILE = path.resolve(__dirname, '../src/data/weapons.generated.json');
const LIST_BASE_URL = 'https://www.aonprd.com/EquipmentWeapons.aspx';
const PROFICIENCY_TABS = ['Simple', 'Martial', 'Exotic', 'Ammo', 'Firearm', 'Mod', 'Siege', 'Special'];
const DELAY_MS = 300;
const USER_AGENT = 'pf1e-spell-tracker-data-pipeline/1.0 (personal project; one-time data build)';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '-', ndash: '-', hellip: '...',
  rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"',
  times: 'x', deg: 'deg', plusmn: '+/-', copy: '(c)', reg: '(R)', trade: '(TM)',
  frac12: '1/2', frac14: '1/4', frac34: '3/4', minus: '-',
};

const SMART_QUOTE_RE = new RegExp(String.fromCharCode(8217), 'g');
const EM_DASH_RE = new RegExp(String.fromCharCode(8212), 'g');

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name] ?? m)
    .replace(SMART_QUOTE_RE, "'")
    .replace(EM_DASH_RE, '-')
    // AoN serves some "x" (times) glyphs -- e.g. "7.62x54mmR" -- as a stray
    // U+001F control byte instead of the actual character.
    .replace(/\x1f/g, '×')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

function stripSup(html) {
  return html.replace(/<sup>[\s\S]*?<\/sup>/gi, '');
}

function stripTags(html) {
  return decodeEntities(stripSup(html).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

// See scrape-aon-wondrous-items.mjs for why line breaks are collapsed via a
// placeholder token rather than preserved directly.
const NEWLINE_PLACEHOLDER = 'PARAGRAPHBREAK';

function htmlToPlainText(html) {
  const withPlaceholders = stripSup(html)
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, NEWLINE_PLACEHOLDER)
    .replace(/<br\s*\/?>/gi, NEWLINE_PLACEHOLDER)
    .replace(/<[^>]+>/g, '');
  const decoded = decodeEntities(withPlaceholders);
  return decoded
    .replace(/\s+/g, ' ')
    .split(NEWLINE_PLACEHOLDER)
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function fetchWithRetry(url, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}

async function cachedFetch(url, cacheKey) {
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.html`);
  try {
    return await fs.readFile(cachePath, 'utf8');
  } catch {
    const html = await fetchWithRetry(url);
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath, html);
    await sleep(DELAY_MS);
    return html;
  }
}

async function getLinks() {
  const linksByName = new Map();
  for (const tab of PROFICIENCY_TABS) {
    const html = await cachedFetch(`${LIST_BASE_URL}?Proficiency=${tab}`, `_list_${tab}`);
    const re = /<a href="EquipmentWeaponsDisplay\.aspx\?ItemName=([^"]+)">(?:<img[^>]*>)?\s*([^<]*)<\/a>/g;
    let m;
    while ((m = re.exec(html))) {
      const rawItemName = decodeEntities(m[1]);
      if (!linksByName.has(rawItemName)) {
        linksByName.set(rawItemName, { rawItemName, label: decodeEntities(m[2]) });
      }
    }
  }
  return [...linksByName.values()];
}

// Generic "<b>Label</b> value" extractor -- see scrape-aon-wondrous-items.mjs
// for the reasoning behind the stop lookahead and trailing-separator trim.
function extractLabeledMap(rawText, labels) {
  const text = decodeEntities(stripSup(rawText));
  const map = {};
  for (const label of labels) {
    const re = new RegExp(`<b>${label}</b>\\s*([\\s\\S]*?)(?=<b>|<br\\s*/?>|<h3|$)`);
    const m = text.match(re);
    if (m) map[label] = stripTags(m[1]).trim().replace(/;\s*$/, '').trim().replace(/\(\s+/g, '(');
  }
  return map;
}

function extractWeaponGroups(rawHeaderHtml) {
  const m = rawHeaderHtml.match(/<b>Weapon Groups<\/b>\s*([\s\S]*?)(?=<h3|$)/);
  if (!m) return [];
  return [...m[1].matchAll(/<a[^>]*>([^<]*)<\/a>/g)]
    .map((mm) => decodeEntities(mm[1]).trim())
    .filter(Boolean);
}

function isDash(value) {
  return value == null || /^-+$/.test(value.trim());
}

function parseCost(raw) {
  if (raw == null || isDash(raw)) return { value: null, raw: raw ?? '' };
  const m = raw.match(/^([+-]?)([\d,]+(?:\.\d+)?)\s*(gp|sp|cp|pp)?/i);
  if (!m) return { value: null, raw };
  const sign = m[1] === '-' ? -1 : 1;
  let value = sign * Number.parseFloat(m[2].replace(/,/g, ''));
  const unit = (m[3] ?? 'gp').toLowerCase();
  if (unit === 'sp') value /= 10;
  else if (unit === 'cp') value /= 100;
  else if (unit === 'pp') value *= 10;
  return { value, raw };
}

function parseWeight(raw) {
  if (raw == null || isDash(raw)) return { value: null, raw: raw ?? '' };
  const m = raw.match(/^([+-]?[\d,.]+)/);
  if (!m) return { value: null, raw };
  return { value: Number.parseFloat(m[1].replace(/,/g, '')), raw };
}

function parseRange(raw) {
  if (raw == null || isDash(raw)) return null;
  const m = raw.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

const DAMAGE_TYPE_WORDS = { B: 'Bludgeoning', P: 'Piercing', S: 'Slashing' };

function parseDamageType(raw) {
  if (raw == null || isDash(raw)) return [];
  const letters = raw.match(/[BPS]/g) ?? [];
  return [...new Set(letters)].map((l) => DAMAGE_TYPE_WORDS[l]);
}

function parseCritical(raw) {
  if (raw == null || isDash(raw)) return null;
  const m = raw.match(/(?:(\d+-\d+)\/)?\s*(x\d+)/i);
  if (!m) return null;
  return { threat: m[1] ?? '20', multiplier: m[2].toLowerCase() };
}

// Most weapons give per-size dice, e.g. "1d3 (small), 1d4 (medium)". Siege
// engines instead give one flat value with no size annotation at all, so
// that case is kept under a "flat" key rather than guessing a size for it.
function parseDamage(raw) {
  if (raw == null) return null;
  const sizes = {};
  let found = false;
  const re = /([^,()]+?)\s*\(([a-z]+)\)/gi;
  let m;
  while ((m = re.exec(raw))) {
    found = true;
    const dieText = m[1].trim();
    sizes[m[2].toLowerCase()] = isDash(dieText) ? null : dieText;
  }
  if (found) return sizes;
  return isDash(raw) ? null : { flat: raw.trim() };
}

function parseList(raw) {
  if (raw == null || isDash(raw)) return [];
  return raw.split(/\s*[;,]\s*/).map((s) => s.trim()).filter(Boolean);
}

const LABELS = [
  'Source', 'Cost', 'Weight', 'Damage', 'Critical', 'Range', 'Type', 'Special',
  'Misfire', 'Capacity', 'Crew', 'Aim', 'Load', 'Speed', 'Category', 'Proficiency',
];

function extractItemChunk(pageHtml) {
  const spanRe = /<span id="MainContent_DataListTypes_LabelName_\d+">([\s\S]*?)<\/span>\s*<\/td>/g;
  const spans = [...pageHtml.matchAll(spanRe)].map((m) => m[1]);
  if (spans.length === 0) return null;
  return spans[0];
}

function parseItemChunk(body) {
  const h1Match = body.match(/<h1 class="title">(?:<img[^>]*>)?\s*([^<]*)<\/h1>/);
  const name = h1Match ? stripTags(h1Match[1]).trim() : '';
  if (!name) return null;

  const headerMatch = body.match(/<\/h1>([\s\S]*?)<h3 class="framing">Description<\/h3>/);
  const headerText = headerMatch ? headerMatch[1] : '';
  const header = extractLabeledMap(headerText, LABELS);

  const descMatch = body.match(/<h3 class="framing">Description<\/h3>([\s\S]*)$/);
  const description = descMatch ? htmlToPlainText(descMatch[1]) : '';

  const cost = parseCost(header.Cost);
  const weight = parseWeight(header.Weight);

  return {
    id: slugify(name),
    name,
    source: header.Source ?? '',
    description,
    cost: cost.value,
    costRaw: cost.raw,
    weight: weight.value,
    weightRaw: weight.raw,
    damage: parseDamage(header.Damage),
    critical: parseCritical(header.Critical),
    range: parseRange(header.Range),
    rangeRaw: header.Range ?? '',
    type: parseDamageType(header.Type),
    special: parseList(header.Special),
    category: parseList(header.Category),
    proficiency: header.Proficiency ? header.Proficiency.toLowerCase() : '',
    weaponGroups: extractWeaponGroups(headerText),
    misfire: header.Misfire ?? null,
    capacity: header.Capacity ?? null,
    crew: header.Crew ?? null,
    aim: header.Aim ?? null,
    load: header.Load ?? null,
    speed: header.Speed ?? null,
  };
}

async function scrapeOne(rawItemName) {
  const url = `https://www.aonprd.com/EquipmentWeaponsDisplay.aspx?ItemName=${encodeURIComponent(rawItemName)}`;
  const html = await cachedFetch(url, slugify(rawItemName));
  const chunk = extractItemChunk(html);
  if (!chunk) return { rawItemName, error: 'not-found-on-page' };
  const parsed = parseItemChunk(chunk);
  if (!parsed) return { rawItemName, error: 'no-name-parsed' };
  return { rawItemName, item: parsed };
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const outArg = process.argv.find((a) => a.startsWith('--out='));
  const outFile = outArg ? path.resolve(outArg.slice('--out='.length)) : OUT_FILE;

  const allLinks = await getLinks();
  console.log(`Found ${allLinks.length} unique item links across ${PROFICIENCY_TABS.length} proficiency tabs.`);

  let rawNames = allLinks.map((l) => l.rawItemName);
  if (onlyArg) {
    const wanted = onlyArg.slice('--only='.length).split('|').map((s) => s.trim().toLowerCase());
    rawNames = rawNames.filter((n) => wanted.includes(n.toLowerCase()));
  } else if (limitArg) {
    rawNames = rawNames.slice(0, Number(limitArg.slice('--limit='.length)));
  }

  const itemsByName = new Map();
  const errors = [];
  let done = 0;
  for (const rawItemName of rawNames) {
    try {
      const result = await scrapeOne(rawItemName);
      if (result.error) {
        errors.push(result);
      } else if (itemsByName.has(result.item.name)) {
        // Duplicate link resolving to the same canonical item.
      } else {
        itemsByName.set(result.item.name, result.item);
      }
    } catch (err) {
      errors.push({ rawItemName, error: String(err) });
    }
    done++;
    if (done % 50 === 0 || done === rawNames.length) {
      console.log(`${done}/${rawNames.length} processed (${itemsByName.size} unique items kept, ${errors.length} errored)`);
    }
  }

  const items = [...itemsByName.values()].sort((a, b) => a.name.localeCompare(b.name));

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(items, null, 2));

  console.log(`Wrote ${items.length} weapons to ${outFile}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Examples:', errors.slice(0, 20));
  }
}

await main();
