import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Rebuilds src/data/spells.generated.json from Archives of Nethys (aonprd.com)
// instead of the local FVTTPF1E Foundry compendium. Replaces unpack-spells.mjs
// + distill-spells.mjs as the source of truth.
//
// Two-pass crawl:
//   1. Spells.aspx?Class=All -> list of every spell name + its detail page link.
//   2. SpellDisplay.aspx?ItemName=<name> for each -> full stat block.
// Detail pages are cached to disk (.tmp/aon-pages) so re-runs after a crash or
// script tweak don't re-fetch pages we already have.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '.tmp/aon-pages');
const OUT_FILE = path.resolve(__dirname, '../src/data/spells.generated.json');
const LIST_URL = 'https://www.aonprd.com/Spells.aspx?Class=All';
const DELAY_MS = 350;
const USER_AGENT = 'pf1e-spell-tracker-data-pipeline/1.0 (personal project; one-time data build)';

// Every class the app tracks (see classes.ts CLASS_IDS). Genuinely
// non-playable/prestige entries on AoN's class list (Red Mantis Assassin,
// Sahir-Afiyun, Summoner (Unchained) as a ruleset variant of Summoner) are
// intentionally excluded -- everything else gets a spell list.
const SUPPORTED_CLASSES = [
  'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'wizard',
  'inquisitor', 'magus', 'oracle', 'summoner', 'witch',
  'adept', 'alchemist', 'antipaladin', 'arcanist', 'bloodrager', 'hunter',
  'investigator', 'medium', 'mesmerist', 'occultist', 'psychic', 'shaman',
  'skald', 'spiritualist', 'warpriest',
];

const SCHOOL_CODES = {
  abjuration: 'abj',
  conjuration: 'con',
  divination: 'div',
  enchantment: 'enc',
  evocation: 'evo',
  illusion: 'ill',
  necromancy: 'nec',
  transmutation: 'trs',
  universal: 'uni',
};

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

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/’/g, "'")
    .replace(/—/g, '--');
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function htmlToPlainText(html) {
  return decodeEntities(
    html
      .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n'),
  ).trim();
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

async function getSpellList() {
  const html = await cachedFetch(LIST_URL, '_all-spells-list');
  const names = new Set();
  const re = /<a href="SpellDisplay\.aspx\?ItemName=([^"]+)">/g;
  let m;
  while ((m = re.exec(html))) {
    names.add(decodeEntities(m[1]));
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

// A single SpellDisplay.aspx?ItemName=X page can contain multiple spells
// (AoN does substring matching, e.g. ItemName=Fireball also returns "Controlled
// Fireball"). Split on <h1 class="title"> boundaries and find the one whose
// name matches exactly. A <h2 class="title"> mid-chunk marks an appended
// Mythic-version addendum -- not part of the base spell, so truncate there.
//
// The results live inside one or more <span id="MainContent_DataListTypes_
// LabelName_N">...</span> blocks. We must bound extraction to those spans --
// otherwise the last (or only) spell's chunk runs off the end of the *whole
// page* and swallows the footer/script HTML into its description.
function extractSpellChunk(pageHtml, targetName) {
  const spanRe = /<span id="MainContent_DataListTypes_LabelName_\d+">([\s\S]*?)<\/span>\s*<\/td>/g;
  const spanContents = [...pageHtml.matchAll(spanRe)].map((m) => m[1]);
  const combined = spanContents.join('');
  const chunks = combined.split(/(?=<h1 class="title">)/);
  const normalizedTarget = targetName.trim().toLowerCase();
  for (const chunk of chunks) {
    const h1Match = chunk.match(/<h1 class="title">(?:<img[^>]*>)?\s*([^<]*)<\/h1>/);
    if (!h1Match) continue;
    const name = stripTags(h1Match[1]).trim();
    if (name.toLowerCase() !== normalizedTarget) continue;
    const mythicSplit = chunk.split(/<h2 class="title">/)[0];
    return { name, body: mythicSplit };
  }
  return null;
}

function parseLevelLine(levelText) {
  const levels = {};
  const tokens = levelText.split(',').map((t) => t.trim()).filter(Boolean);
  for (const token of tokens) {
    const m = token.match(/^(.+?)\s+(\d+)$/);
    if (!m) continue;
    const classId = m[1].trim().toLowerCase();
    const level = Number(m[2]);
    if (SUPPORTED_CLASSES.includes(classId)) {
      levels[classId] = level;
    }
  }
  return levels;
}

function extractField(body, label, endPattern) {
  const re = new RegExp(`<b>${label}</b>\\s*(.*?)${endPattern}`, 's');
  const m = body.match(re);
  return m ? stripTags(m[1]) : '';
}

// Matches the old Foundry-derived dataset's convention: Range/Duration/Saving
// Throw/Spell Resistance are capitalized ("Close (...)", "Instantaneous",
// "None", "Yes"), while Effect/Components stay as authored (lowercase).
function capitalizeFirst(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function parseSpellChunk(body) {
  const schoolLine = body.match(/<b>School<\/b>\s*(.*?)<h3/s);
  let school = '';
  let subschool = [];
  let descriptors = [];
  let levels = {};
  if (schoolLine) {
    const raw = schoolLine[1];
    const levelSplit = raw.split(/<b>Level<\/b>/);
    const schoolPart = levelSplit[0];
    const levelPart = levelSplit[1] ?? '';

    const mainSchoolMatch = schoolPart.match(/<a[^>]*>([^<]+)<\/a>/);
    const mainSchoolName = mainSchoolMatch ? stripTags(mainSchoolMatch[1]).toLowerCase() : '';
    school = SCHOOL_CODES[mainSchoolName] ?? mainSchoolName;

    const subschoolMatch = schoolPart.match(/\(([^)]*)\)/);
    if (subschoolMatch) {
      subschool = [...subschoolMatch[1].matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => stripTags(m[1]).toLowerCase());
    }

    const descriptorMatch = schoolPart.match(/\[([^\]]*)\]/);
    if (descriptorMatch) {
      descriptors = [...descriptorMatch[1].matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => stripTags(m[1]).toLowerCase());
    }

    levels = parseLevelLine(stripTags(levelPart.replace(/;\s*$/, '')));
  }

  const castingTime = extractField(body, 'Casting Time', '<br');
  const components = extractField(body, 'Components', '<h3');
  const range = capitalizeFirst(extractField(body, 'Range', '<br'));
  const effect = extractField(body, 'Effect', '<br')
    || extractField(body, 'Area', '<br')
    || extractField(body, 'Targets', '<br')
    || extractField(body, 'Target', '<br');
  const duration = capitalizeFirst(extractField(body, 'Duration', '<br'));

  // Greedy: the Saving Throw text itself can contain a ";" (e.g. "Will half;
  // see text"), so a lazy match would stop at that internal semicolon instead
  // of the real delimiter right before "Spell Resistance".
  const saveMatch = body.match(/<b>Saving Throw<\/b>\s*(.*);\s*<b>Spell Resistance<\/b>\s*(.*?)<h3/s);
  const savingThrow = capitalizeFirst(saveMatch ? stripTags(saveMatch[1]) : '');
  const spellResistance = capitalizeFirst(saveMatch ? stripTags(saveMatch[2]) : '');

  const descMatch = body.match(/<h3 class="framing">Description<\/h3>(.*)$/s);
  const description = descMatch ? htmlToPlainText(descMatch[1]) : '';

  return { school, subschool, descriptors, levels, castingTime, components, range, effect, duration, savingThrow, spellResistance, description };
}

async function scrapeOne(name) {
  const url = `https://www.aonprd.com/SpellDisplay.aspx?ItemName=${encodeURIComponent(name)}`;
  const html = await cachedFetch(url, slugify(name));
  const chunk = extractSpellChunk(html, name);
  if (!chunk) return { name, error: 'not-found-on-page' };

  const parsed = parseSpellChunk(chunk.body);
  if (Object.keys(parsed.levels).length === 0) return { name, error: 'no-supported-class' };

  return {
    id: slugify(chunk.name),
    name: chunk.name,
    ...parsed,
  };
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const outArg = process.argv.find((a) => a.startsWith('--out='));
  const outFile = outArg ? path.resolve(outArg.slice('--out='.length)) : OUT_FILE;

  let names = await getSpellList();
  console.log(`Found ${names.length} unique spell names in the master list.`);

  if (onlyArg) {
    const wanted = onlyArg.slice('--only='.length).split('|').map((s) => s.trim().toLowerCase());
    names = names.filter((n) => wanted.includes(n.toLowerCase()));
  } else if (limitArg) {
    names = names.slice(0, Number(limitArg.slice('--limit='.length)));
  }

  const spells = [];
  const errors = [];
  let done = 0;
  for (const name of names) {
    try {
      const result = await scrapeOne(name);
      if (result.error) {
        errors.push(result);
      } else {
        spells.push(result);
      }
    } catch (err) {
      errors.push({ name, error: String(err) });
    }
    done++;
    if (done % 50 === 0 || done === names.length) {
      console.log(`${done}/${names.length} processed (${spells.length} kept, ${errors.length} dropped/errored)`);
    }
  }

  spells.sort((a, b) => a.name.localeCompare(b.name));

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(spells, null, 2));

  console.log(`Wrote ${spells.length} spells to ${outFile}`);
  const dropped = errors.filter((e) => e.error === 'no-supported-class').length;
  const notFound = errors.filter((e) => e.error === 'not-found-on-page').length;
  const other = errors.length - dropped - notFound;
  console.log(`Dropped (no supported class on it): ${dropped}`);
  console.log(`Not found on their own page (name mismatch): ${notFound}`);
  console.log(`Other errors: ${other}`);
  if (other > 0) {
    console.log(errors.filter((e) => e.error !== 'no-supported-class' && e.error !== 'not-found-on-page').slice(0, 20));
  }
  if (notFound > 0) {
    console.log('Examples of not-found:', errors.filter((e) => e.error === 'not-found-on-page').slice(0, 10).map((e) => e.name));
  }
}

await main();
