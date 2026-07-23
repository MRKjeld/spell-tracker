import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Builds src/data/wondrousItems.generated.json from Archives of Nethys
// (aonprd.com) Wondrous Items pages.
//
// Two-pass crawl, same shape as scrape-aon-spells.mjs:
//   1. MagicWondrous.aspx?FinalSlot=<Slot> for each slot category -> every
//      item name + its MagicWondrousDisplay.aspx?FinalName=<name> link.
//   2. MagicWondrousDisplay.aspx?FinalName=<name> for each unique link ->
//      full stat block.
// Detail pages are cached to disk (.tmp/aon-wondrous-pages) so re-runs after
// a crash or script tweak don't re-fetch pages we already have.
//
// AoN groups price-tiered variants of one item (e.g. "Belt of Giant
// Strength" +2/+4/+6) under multiple distinct FinalName links (...Strength2,
// ...Strength4, ...Strength6) that all resolve to the SAME detail page with
// combined pricing. We fetch every link (cheap once cached) but dedupe the
// final dataset by the canonical h1 name so each real item appears once.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '.tmp/aon-wondrous-pages');
const OUT_FILE = path.resolve(__dirname, '../src/data/wondrousItems.generated.json');
const DELAY_MS = 300;
const USER_AGENT = 'pf1e-spell-tracker-data-pipeline/1.0 (personal project; one-time data build)';

// Every FinalSlot category on MagicWondrous.aspx (each reachable from any
// other via the page's own nav, per the site's own category links).
const SLOTS = [
  'Belts', 'Body', 'Chest', 'Eyes', 'Feet', 'Hands', 'Head', 'Headband',
  'Ioun', 'Neck', 'Other', 'Shoulders', 'Wrist',
];

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

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

// Source text nodes on AoN's pages are hard-wrapped with literal CR/LF line
// breaks (an authoring artifact, not intentional paragraph breaks), so all
// original whitespace, including those, is collapsed to single spaces. Only
// <br>/<p>/<div>/<li>/<h#>/<tr> boundaries become real newlines, via a
// placeholder token (letters only, never whitespace) swapped back in after
// the whitespace collapse.
const NEWLINE_PLACEHOLDER = 'PARAGRAPHBREAK';

function htmlToPlainText(html) {
  const withPlaceholders = html
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

async function getLinksForSlot(slot) {
  const url = `https://www.aonprd.com/MagicWondrous.aspx?FinalSlot=${slot}`;
  const html = await cachedFetch(url, `_list-${slot}`);
  const re = /<a href="MagicWondrousDisplay\.aspx\?FinalName=([^"]+)">(?:<img[^>]*>)?\s*([^<]*)<\/a>/g;
  const links = [];
  let m;
  while ((m = re.exec(html))) {
    links.push({ rawFinalName: decodeEntities(m[1]), label: decodeEntities(m[2]) });
  }
  return links;
}

// Generic "<b>Label</b> value" extractor. Stops at the next "<b>" (same
// line or next line, i.e. the next field), "<br" (a trailing line break
// with no following field), "<h3" (next section), or the end of the search
// text, so it tolerates fields being absent, reordered, or the very last
// field on a line/section. A trailing "; " separator left dangling on the
// captured value (the normal case) is trimmed off afterward.
//
// Entities are decoded up front (tags are untouched by decodeEntities, so
// this is safe to do before the label regex runs): a couple of fields end
// in an entity like "&mdash;" immediately followed by "<b>" with no
// separating "; " of its own, and the entity's own trailing ";" would
// otherwise be mistaken for a field separator, truncating the decoded dash
// off the value.
function extractLabeledMap(rawText, labels) {
  const text = decodeEntities(rawText);
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

// Best-effort structured parse of a discrete "N uses per period" limit out
// of free-form prose. Wondrous Items don't have a dedicated "Charges" field
// the way wands/staves do -- any usage limit is just embedded in the
// description -- so this only recognizes a handful of common phrasings and
// returns null rather than guessing when nothing matches. Duration-style
// limits ("10 rounds per day", "for 1 minute per day") are deliberately left
// unparsed: they describe a time budget, not a count of discrete uses, so
// forcing them into { quantity, per } would misrepresent them. The full
// wording always remains available in the item's `description`.
// Returns { quantity, per, index }, where `index` is the character offset
// of the matched clause in the description (used afterward to search for a
// nearby action-type mention). `per`/`quantity` are what actually end up in
// the item's `uses` object; `index` is stripped back out before that.
function extractUses(descriptionText) {
  // "Once per day", "Twice per week", "Three times per day", "3 times per month"
  let m = descriptionText.match(
    /\b(once|twice|thrice|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b(?:\s+times?)?\s+per\s+(day|week|month)\b/i,
  );
  if (m) {
    const quantity = wordToNumber(m[1]);
    if (quantity) return { quantity, per: m[2].toLowerCase(), index: m.index };
  }

  // "3/day", "1/week", "2/month" shorthand.
  m = descriptionText.match(/\b(\d+)\s*\/\s*(day|week|month)\b/i);
  if (m) return { quantity: Number(m[1]), per: m[2].toLowerCase(), index: m.index };

  // A fixed charge pool with no stated periodic refresh, e.g. "25 charges
  // when created", "can hold up to 3 charges". `per: null` distinguishes
  // this from a daily/weekly/monthly allowance. Descriptions often mention
  // charges twice over -- the per-use cost ("expends 1 charge") as well as
  // the total pool ("has 25 charges when created") -- so take the largest
  // number found rather than the first; the total capacity is always >=
  // the per-use cost, which is almost always 1.
  const poolMatches = [...descriptionText.matchAll(/\b(\d+)\s+charges?\b/gi)];
  if (poolMatches.length > 0) {
    const best = poolMatches.reduce((a, b) => (Number(b[1]) > Number(a[1]) ? b : a));
    return { quantity: Math.max(...poolMatches.map((match) => Number(match[1]))), per: null, index: best.index };
  }

  return null;
}

// PF1e's action economy: free, swift, immediate, move, standard, full-round.
// Matched broadly (not just "as a/an X action") since prose describes the
// same cost many ways -- "is a standard action", "spend a swift action",
// "requires a full-round action" -- and the action-type word plus "action"
// together is already an unambiguous signal.
const ACTION_RE = /\b(free|swift|immediate|move|standard|full[- ]?round)\s+actions?\b/i;

function normalizeActionType(raw) {
  const normalized = raw.toLowerCase().replace(/\s+/g, '-');
  // The source has at least one "fullround action" (no space/hyphen) typo.
  return normalized === 'fullround' ? 'full-round' : normalized;
}

// Best-effort: prefer an action-type mention in the same sentence as the
// uses clause (since one description can cover several powers with
// different costs), falling back to the first action-type mention anywhere
// in the description, else null.
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

// A detail page can (rarely) contain more than one
// <span id="MainContent_DataListTypes_LabelName_N"> block if AoN's substring
// match picked up more than one entry. We take the first block, since our
// links are harvested directly from a slot listing page and should always
// resolve to the intended item (or its price-tiered family page).
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
  const url = `https://www.aonprd.com/MagicWondrousDisplay.aspx?FinalName=${encodeURIComponent(rawFinalName)}`;
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
  const slotsArg = process.argv.find((a) => a.startsWith('--slots='));
  const outArg = process.argv.find((a) => a.startsWith('--out='));
  const outFile = outArg ? path.resolve(outArg.slice('--out='.length)) : OUT_FILE;

  const slots = slotsArg ? slotsArg.slice('--slots='.length).split(',') : SLOTS;

  const allLinks = [];
  const seenRaw = new Set();
  for (const slot of slots) {
    const links = await getLinksForSlot(slot);
    console.log(`${slot}: ${links.length} links`);
    for (const link of links) {
      if (!seenRaw.has(link.rawFinalName)) {
        seenRaw.add(link.rawFinalName);
        allLinks.push(link);
      }
    }
  }
  console.log(`Found ${allLinks.length} unique item links across ${slots.length} slot page(s).`);

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
        // Same canonical item reached via a different price-tier link
        // (e.g. "Belt of Giant Strength2/4/6" all resolve to one page).
      } else {
        itemsByName.set(result.item.name, result.item);
      }
    } catch (err) {
      errors.push({ rawFinalName, error: String(err) });
    }
    done++;
    if (done % 100 === 0 || done === rawNames.length) {
      console.log(`${done}/${rawNames.length} processed (${itemsByName.size} unique items kept, ${errors.length} errored)`);
    }
  }

  const items = [...itemsByName.values()].sort((a, b) => a.name.localeCompare(b.name));

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(items, null, 2));

  console.log(`Wrote ${items.length} wondrous items to ${outFile}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Examples:', errors.slice(0, 20));
  }
}

await main();
