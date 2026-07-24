import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Builds src/data/armor.generated.json from Archives of Nethys (aonprd.com)'s
// Unique Armor page. Same shape as scrape-aon-wondrous-items.mjs, but simpler:
// MagicArmor.aspx?Category=SpecificArmor lists every item on one page (no
// per-slot crawl needed), each linking to MagicArmorDisplay.aspx?ItemName=<name>
// for the full stat block. Detail pages are cached to disk
// (.tmp/aon-armor-pages) so re-runs after a crash or script tweak don't
// re-fetch pages we already have.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '.tmp/aon-armor-pages');
const OUT_FILE = path.resolve(__dirname, '../src/data/armor.generated.json');
const LIST_URL = 'https://www.aonprd.com/MagicArmor.aspx?Category=SpecificArmor';
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
  const html = await cachedFetch(LIST_URL, '_list');
  const re = /<a href="MagicArmorDisplay\.aspx\?ItemName=([^"]+)">(?:<img[^>]*>)?\s*([^<]*)<\/a>/g;
  const links = [];
  let m;
  while ((m = re.exec(html))) {
    links.push({ rawItemName: decodeEntities(m[1]), label: decodeEntities(m[2]) });
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
// free-form prose -- identical heuristic to scrape-aon-wondrous-items.mjs
// (armor/shields with activated powers describe them in prose the same way
// wondrous items do). Returns null rather than guessing when nothing
// recognizable matches; the full wording always remains in `description`.
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

// PF1e's fixed set of base armor types, longest-first so "studded leather"
// wins over "leather" and "full plate" is checked before any looser match.
// A trailing "armor" word (as in "+2 hide armor") is captured separately so
// e.g. "leather" -> "leather armor" but "breastplate" -> "breastplate" (the
// source doesn't always repeat "armor" after the specific type name).
const ARMOR_BASE_TYPES = [
  'studded leather', 'chain shirt', 'scale mail', 'splint mail', 'banded mail',
  'half-plate', 'full plate', 'breastplate', 'chainmail', 'leather', 'padded', 'hide',
].sort((a, b) => b.length - a.length);

const ARMOR_TYPE_ALT = ARMOR_BASE_TYPES.map((t) => t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');

// Tier 1: bonus and canonical type named together (a stray adjective or two
// for a special ability, e.g. "+1 defiant chainmail", is skipped over)
// anywhere in the description. Some items don't state their own type/bonus
// until a later sentence (e.g. "Djezet skin acts as a suit of +1 leather..."),
// so this deliberately isn't limited to the first sentence -- requiring the
// bonus number to sit right next to a recognized type name is itself enough
// to rule out an unrelated "+2 enhancement bonus to AC" mentioned elsewhere.
// The filler-word group has a negative lookahead so it can't greedily
// consume the first word of a multi-word type (e.g. "studded" in "studded
// leather") before the alternation gets a chance to match the longer phrase
// as a whole -- without it, "+3 studded leather armor" wrongly shrinks to
// "leather armor".
const ARMOR_JOINT_RE = new RegExp(
  `\\+(\\d+)\\s+(?:(?!(?:${ARMOR_TYPE_ALT})\\b)[a-zA-Z][a-zA-Z'-]*\\s+){0,3}(${ARMOR_TYPE_ALT})(\\s+armor)?\\b`,
  'i',
);

// Tier 2: canonical type alone, no bonus nearby (masterwork/nonmagical items
// have no "+N" at all). Limited to the first sentence, where AoN's template
// always opens with the item's own type.
const ARMOR_TYPE_ONLY_RE = new RegExp(`\\b(${ARMOR_TYPE_ALT})(\\s+armor)?\\b`, 'i');

// Tier 3 fallback for armor types outside PF1e's core 12 (setting-specific
// names like "field plate", "elven chain", "steel lamellar"): capture
// whatever noun phrase follows "+N" (or, lacking a bonus, follows the
// leading "This/These") up to the sentence's main verb. Only applied to the
// first sentence, and only when it opens with AoN's standard "This/These..."
// item template, since without that anchor there's no reliable way to tell
// scene-setting prose from the item's own type.
const VERB_STOPWORDS = new Set([
  'is', 'are', 'was', 'were', 'has', 'have', 'had', 'can', 'could', 'will', 'would',
  'grants', 'grant', 'provides', 'provide', 'protects', 'protect', 'resists', 'resist',
  'glows', 'glow', 'oozes', 'ooze', 'weighs', 'weigh', 'requires', 'require', 'counts', 'count',
  'acts', 'act', 'functions', 'function', 'offers', 'offer', 'absorbs', 'absorb',
  'reduces', 'reduce', 'increases', 'increase', 'decreases', 'decrease', 'bestows', 'bestow',
  'gives', 'give', 'deals', 'deal', 'negates', 'negate', 'reflects', 'reflect',
  'looks', 'look', 'appears', 'appear', 'allows', 'allow', 'causes', 'cause',
  'carries', 'carry', 'contains', 'contain', 'feels', 'feel', 'seems', 'seem',
  'becomes', 'become', 'makes', 'make', 'works', 'work', 'deflects', 'deflect',
  'comes', 'come', 'remains', 'remain', 'stays', 'stay', 'radiates', 'radiate',
  'emits', 'emit', 'bears', 'bear', 'sports', 'sport', 'features', 'feature',
  'houses', 'house', 'embodies', 'embody', 'imbues', 'imbue', 'forms', 'form',
]);

function genericTypeCapture(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const out = [];
  for (const raw of words) {
    const isPunct = /[,.;:]$/.test(raw);
    const bare = raw.replace(/[,.;:]+$/, '');
    if (VERB_STOPWORDS.has(bare.toLowerCase())) break;
    out.push(bare);
    if (isPunct || out.length >= 6) break;
  }
  return out.length ? out.join(' ').toLowerCase() : null;
}

function firstSentence(text) {
  const idx = text.indexOf('.');
  return idx === -1 ? text : text.slice(0, idx + 1);
}

function extractArmorInfo(description) {
  const joint = description.match(ARMOR_JOINT_RE);
  if (joint) {
    return { enhancementBonus: Number(joint[1]), armorType: (joint[2] + (joint[3] ?? '')).toLowerCase() };
  }

  const sentence = firstSentence(description);
  const typeOnly = sentence.match(ARMOR_TYPE_ONLY_RE);
  if (typeOnly) {
    return { enhancementBonus: null, armorType: (typeOnly[1] + (typeOnly[2] ?? '')).toLowerCase() };
  }

  // Tier 3a: any "+N" in the first sentence, regardless of how the sentence
  // opens -- anchoring the capture on the bonus number itself is safe on its
  // own (same reasoning as the joint regex above).
  const plusMatch = sentence.match(/\+(\d+)\s+([\s\S]*)$/);
  if (plusMatch) {
    return { enhancementBonus: Number(plusMatch[1]), armorType: genericTypeCapture(plusMatch[2]) };
  }

  // Tier 3b: no bonus at all -- only safe to guess a type from the
  // sentence's own opening words when it follows AoN's standard
  // "This/These..." template.
  const lead = sentence.match(/^(?:this|these)\s+(?:is\s+|are\s+)?(?:a\s+|an\s+)?/i);
  if (!lead) return { enhancementBonus: null, armorType: null };
  return { enhancementBonus: null, armorType: genericTypeCapture(sentence.slice(lead[0].length)) };
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

  const { enhancementBonus, armorType } = extractArmorInfo(description);

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
    enhancementBonus,
    armorType,
  };
}

async function scrapeOne(rawItemName) {
  const url = `https://www.aonprd.com/MagicArmorDisplay.aspx?ItemName=${encodeURIComponent(rawItemName)}`;
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
  console.log(`Found ${allLinks.length} unique item links on the Unique Armor page.`);

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

  console.log(`Wrote ${items.length} armor items to ${outFile}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Examples:', errors.slice(0, 20));
  }
}

await main();
