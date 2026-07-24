import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Builds src/data/baseArmor.generated.json from Archives of Nethys (aonprd.com)'s
// Armor page. This is the mundane equipment catalog (Padded, Full plate,
// Buckler, Tower shield, armor spikes, ...) -- NOT the magic-item catalog
// already covered by scrape-aon-armor.mjs / scrape-aon-shields.mjs. Like
// EquipmentWeapons.aspx, EquipmentArmor.aspx renders no rows without a
// `Category` filter (Light, Medium, Heavy, Shield, Extra, Mod), so each tab
// is crawled separately. The item's `category` field is derived purely from
// which tab its list link was found under (i.e. from the URL), not parsed
// from prose, since AoN's own stat block never restates it. Detail pages are
// cached to disk (.tmp/aon-base-armor-pages) so re-runs after a crash or
// script tweak don't re-fetch pages we already have.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '.tmp/aon-base-armor-pages');
const OUT_FILE = path.resolve(__dirname, '../src/data/baseArmor.generated.json');
const LIST_BASE_URL = 'https://www.aonprd.com/EquipmentArmor.aspx';
const CATEGORY_TABS = ['Light', 'Medium', 'Heavy', 'Shield', 'Extra', 'Mod'];
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

// Maps each item name to the (single) category tab its list link was found
// under -- this is the source of truth for `category`, not anything parsed
// out of the detail page's own prose.
async function getLinksByCategory() {
  const linksByName = new Map();
  for (const tab of CATEGORY_TABS) {
    const html = await cachedFetch(`${LIST_BASE_URL}?Category=${tab}`, `_list_${tab}`);
    const re = /<a href="EquipmentArmorDisplay\.aspx\?ItemName=([^"]+)">(?:<img[^>]*>)?\s*([^<]*)<\/a>/g;
    let m;
    while ((m = re.exec(html))) {
      const rawItemName = decodeEntities(m[1]);
      if (!linksByName.has(rawItemName)) {
        linksByName.set(rawItemName, { rawItemName, label: decodeEntities(m[2]), category: tab.toLowerCase() });
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

function parseSignedInt(raw) {
  if (raw == null || isDash(raw)) return null;
  const m = raw.match(/([+-]?\d+)/);
  return m ? Number(m[1]) : null;
}

function parsePercent(raw) {
  if (raw == null || isDash(raw)) return null;
  const m = raw.match(/(\d+)\s*%/);
  return m ? Number(m[1]) : null;
}

// AoN's "Speed" stat gives two values separated by "/": the armor's speed
// penalty for a character with a base speed of 30 ft., then for one with a
// base speed of 20 ft. (e.g. "20 ft./15 ft."). Shields and non-armor items
// show "-/-" since they don't affect speed.
function parseSpeed(raw) {
  if (raw == null) return { base30: null, base20: null };
  const parts = raw.split('/').map((s) => s.trim());
  const base30 = parts[0] && !isDash(parts[0]) ? parts[0] : null;
  const base20 = parts[1] && !isDash(parts[1]) ? parts[1] : null;
  return { base30, base20 };
}

const LABELS = [
  'Source', 'Cost', 'Weight', 'Armor Bonus', 'Max Dex Bonus', 'Armor Check Penalty',
  'Arcane Spell Failure Chance', 'Speed',
];

function extractItemChunk(pageHtml) {
  const spanRe = /<span id="MainContent_DataListTypes_LabelName_\d+">([\s\S]*?)<\/span>\s*<\/td>/g;
  const spans = [...pageHtml.matchAll(spanRe)].map((m) => m[1]);
  if (spans.length === 0) return null;
  return spans[0];
}

function parseItemChunk(body, category) {
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
  const speed = parseSpeed(header.Speed);

  return {
    id: slugify(name),
    name,
    category,
    source: header.Source ?? '',
    description,
    cost: cost.value,
    costRaw: cost.raw,
    weight: weight.value,
    weightRaw: weight.raw,
    armorBonus: parseSignedInt(header['Armor Bonus']),
    armorBonusRaw: header['Armor Bonus'] ?? '',
    maxDexBonus: parseSignedInt(header['Max Dex Bonus']),
    maxDexBonusRaw: header['Max Dex Bonus'] ?? '',
    armorCheckPenalty: parseSignedInt(header['Armor Check Penalty']),
    armorCheckPenaltyRaw: header['Armor Check Penalty'] ?? '',
    arcaneSpellFailureChance: parsePercent(header['Arcane Spell Failure Chance']),
    speedAt30: speed.base30,
    speedAt20: speed.base20,
    speedRaw: header.Speed ?? '',
  };
}

async function scrapeOne(rawItemName, category) {
  const url = `https://www.aonprd.com/EquipmentArmorDisplay.aspx?ItemName=${encodeURIComponent(rawItemName)}`;
  const html = await cachedFetch(url, `${category}__${slugify(rawItemName)}`);
  const chunk = extractItemChunk(html);
  if (!chunk) return { rawItemName, error: 'not-found-on-page' };
  const parsed = parseItemChunk(chunk, category);
  if (!parsed) return { rawItemName, error: 'no-name-parsed' };
  return { rawItemName, item: parsed };
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const outArg = process.argv.find((a) => a.startsWith('--out='));
  const outFile = outArg ? path.resolve(outArg.slice('--out='.length)) : OUT_FILE;

  const allLinks = await getLinksByCategory();
  console.log(`Found ${allLinks.length} unique item links across ${CATEGORY_TABS.length} category tabs.`);

  let entries = allLinks;
  if (onlyArg) {
    const wanted = onlyArg.slice('--only='.length).split('|').map((s) => s.trim().toLowerCase());
    entries = entries.filter((l) => wanted.includes(l.rawItemName.toLowerCase()));
  } else if (limitArg) {
    entries = entries.slice(0, Number(limitArg.slice('--limit='.length)));
  }

  const itemsByName = new Map();
  const errors = [];
  let done = 0;
  for (const { rawItemName, category } of entries) {
    try {
      const result = await scrapeOne(rawItemName, category);
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
    if (done % 25 === 0 || done === entries.length) {
      console.log(`${done}/${entries.length} processed (${itemsByName.size} unique items kept, ${errors.length} errored)`);
    }
  }

  const items = [...itemsByName.values()].sort((a, b) => a.name.localeCompare(b.name));

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(items, null, 2));

  console.log(`Wrote ${items.length} armor/shield items to ${outFile}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Examples:', errors.slice(0, 20));
  }
}

await main();
