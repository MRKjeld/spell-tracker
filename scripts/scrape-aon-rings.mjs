import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Builds src/data/rings.generated.json from Archives of Nethys (aonprd.com)'s
// Rings page. Mirrors scrape-aon-armor.mjs / scrape-aon-wondrous-items.mjs --
// see those files for the shared reasoning. MagicRings.aspx lists every ring
// on one page (no per-slot crawl needed, unlike wondrous items), each linking
// to MagicRingsDisplay.aspx?FinalName=<name> for the full stat block. Detail
// pages are cached to disk (.tmp/aon-ring-pages) so re-runs after a crash or
// script tweak don't re-fetch pages we already have.
//
// Unlike armor/shields, rings have no "+N <type>" naming convention -- each
// ring is its own uniquely named item -- so there's no enhancement-bonus/type
// extraction here.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '.tmp/aon-ring-pages');
const OUT_FILE = path.resolve(__dirname, '../src/data/rings.generated.json');
const LIST_URL = 'https://www.aonprd.com/MagicRings.aspx';
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
    .replace(EM_DASH_RE, '-');
}

// AoN marks a special ability's sourcebook (e.g. "defiant<sup>UE</sup>") with
// a footnote directly abutting the following tag, no separating space --
// stripping tags naively would glue it onto the next word ("defiantUE
// chainmail"). Drop the whole footnote instead of just its tags.
function stripSup(html) {
  return html.replace(/<sup>[\s\S]*?<\/sup>/gi, '');
}

function stripTags(html) {
  return decodeEntities(stripSup(html).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

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
  const html = await cachedFetch(LIST_URL, '_list');
  const re = /<a href="MagicRingsDisplay\.aspx\?FinalName=([^"]+)">(?:<img[^>]*>)?\s*([^<]*)<\/a>/g;
  const links = [];
  let m;
  while ((m = re.exec(html))) {
    links.push({ rawFinalName: decodeEntities(m[1]), label: decodeEntities(m[2]) });
  }
  return links;
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

const NUMBER_WORDS = {
  once: 1, twice: 2, thrice: 3,
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function wordToNumber(word) {
  const lower = word.toLowerCase();
  if (NUMBER_WORDS[lower] != null) return NUMBER_WORDS[lower];
  const n = Number(word);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Best-effort structured parse of a discrete "N uses per period" limit out of
// free-form prose -- identical heuristic to scrape-aon-wondrous-items.mjs.
// Returns null rather than guessing when nothing recognizable matches; the
// full wording always remains in `description`.
function extractUses(descriptionText) {
  let m = descriptionText.match(
    /\b(once|twice|thrice|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b(?:\s+times?)?\s+per\s+(day|week|month)\b/i,
  );
  if (m) {
    const quantity = wordToNumber(m[1]);
    if (quantity) return { quantity, per: m[2].toLowerCase(), index: m.index };
  }

  m = descriptionText.match(/\b(\d+)\s*\/\s*(day|week|month)\b/i);
  if (m) return { quantity: Number(m[1]), per: m[2].toLowerCase(), index: m.index };

  const poolMatches = [...descriptionText.matchAll(/\b(\d+)\s+charges?\b/gi)];
  if (poolMatches.length > 0) {
    const best = poolMatches.reduce((a, b) => (Number(b[1]) > Number(a[1]) ? b : a));
    return { quantity: Math.max(...poolMatches.map((match) => Number(match[1]))), per: null, index: best.index };
  }

  return null;
}

const ACTION_RE = /\b(free|swift|immediate|move|standard|full[- ]?round)\s+actions?\b/i;

function normalizeActionType(raw) {
  const normalized = raw.toLowerCase().replace(/\s+/g, '-');
  return normalized === 'fullround' ? 'full-round' : normalized;
}

function extractAction(descriptionText, usesIndex) {
  if (usesIndex != null) {
    const sentenceStart = descriptionText.lastIndexOf('.', usesIndex);
    const sentenceEndSearch = descriptionText.indexOf('.', usesIndex);
    const start = sentenceStart === -1 ? 0 : sentenceStart + 1;
    const end = sentenceEndSearch === -1 ? descriptionText.length : sentenceEndSearch + 1;
    const nearby = descriptionText.slice(start, end).match(ACTION_RE);
    if (nearby) return normalizeActionType(nearby[1]);
  }
  const anywhere = descriptionText.match(ACTION_RE);
  return anywhere ? normalizeActionType(anywhere[1]) : null;
}

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
  const header = extractLabeledMap(headerText, ['Aura', 'CL', 'Slot', 'Price', 'Weight']);

  const descMatch = body.match(
    /<h3 class="framing">Description<\/h3>([\s\S]*?)(?:<h3 class="framing">Construction<\/h3>|$)/,
  );
  const description = descMatch ? htmlToPlainText(descMatch[1]) : '';

  const constructionMatch = body.match(/<h3 class="framing">Construction<\/h3>([\s\S]*)$/);
  const constructionText = constructionMatch ? constructionMatch[1] : '';
  const construction = extractLabeledMap(constructionText, ['Requirements', 'Cost']);

  const usesMatch = extractUses(description);
  const uses = usesMatch
    ? { quantity: usesMatch.quantity, per: usesMatch.per, action: extractAction(description, usesMatch.index) }
    : null;

  return {
    id: slugify(name),
    name,
    slot: header.Slot ?? '',
    price: header.Price ?? '',
    aura: header.Aura ?? '',
    cl: header.CL ?? '',
    weight: header.Weight ?? '',
    description,
    construction: {
      requirements: construction.Requirements ?? '',
      cost: construction.Cost ?? '',
    },
    uses,
  };
}

async function scrapeOne(rawFinalName) {
  const url = `https://www.aonprd.com/MagicRingsDisplay.aspx?FinalName=${encodeURIComponent(rawFinalName)}`;
  const html = await cachedFetch(url, slugify(rawFinalName));
  const chunk = extractItemChunk(html);
  if (!chunk) return { rawFinalName, error: 'not-found-on-page' };
  const parsed = parseItemChunk(chunk);
  if (!parsed) return { rawFinalName, error: 'no-name-parsed' };
  return { rawFinalName, item: parsed };
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const outArg = process.argv.find((a) => a.startsWith('--out='));
  const outFile = outArg ? path.resolve(outArg.slice('--out='.length)) : OUT_FILE;

  const allLinks = await getLinks();
  console.log(`Found ${allLinks.length} unique item links on the Rings page.`);

  let rawNames = allLinks.map((l) => l.rawFinalName);
  if (onlyArg) {
    const wanted = onlyArg.slice('--only='.length).split('|').map((s) => s.trim().toLowerCase());
    rawNames = rawNames.filter((n) => wanted.includes(n.toLowerCase()));
  } else if (limitArg) {
    rawNames = rawNames.slice(0, Number(limitArg.slice('--limit='.length)));
  }

  const itemsByName = new Map();
  const errors = [];
  let done = 0;
  for (const rawFinalName of rawNames) {
    try {
      const result = await scrapeOne(rawFinalName);
      if (result.error) {
        errors.push(result);
      } else if (itemsByName.has(result.item.name)) {
        // Duplicate link resolving to the same canonical item.
      } else {
        itemsByName.set(result.item.name, result.item);
      }
    } catch (err) {
      errors.push({ rawFinalName, error: String(err) });
    }
    done++;
    if (done % 50 === 0 || done === rawNames.length) {
      console.log(`${done}/${rawNames.length} processed (${itemsByName.size} unique items kept, ${errors.length} errored)`);
    }
  }

  const items = [...itemsByName.values()].sort((a, b) => a.name.localeCompare(b.name));

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(items, null, 2));

  console.log(`Wrote ${items.length} ring items to ${outFile}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Examples:', errors.slice(0, 20));
  }
}

await main();
